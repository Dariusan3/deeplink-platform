import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";

// Looks up the partner by referral code and inserts a partner_referrals row.
// Idempotent: the (partner_id, referred_user_id) UNIQUE constraint prevents
// duplicates if the user re-runs the confirm/OAuth flow. Shared by the OAuth
// callback (/auth/callback) and the email confirm route (/auth/confirm).
export async function claimPartnerReferral(refCode: string, userId: string, email: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  try {
    const { data: partner } = await supabase
      .from("partner_profiles")
      .select("id, user_id")
      .eq("referral_code", refCode)
      .maybeSingle();
    if (!partner) return;

    const { error: refErr } = await supabase.from("partner_referrals").insert({
      partner_id: partner.id,
      referred_user_id: userId,
      referred_email: email,
      status: "pending",
      monthly_value: 0,
    });

    // Mark the most recent click for this partner as converted (best-effort)
    await supabase
      .from("partner_referral_clicks")
      .update({ converted: true })
      .eq("partner_id", partner.id)
      .eq("converted", false)
      .order("clicked_at", { ascending: false })
      .limit(1);

    // Audit only if the referral row was actually created (the unique
    // constraint may have skipped it if the user re-runs the flow).
    if (!refErr) {
      await logAuditEvent(supabase, {
        eventType: "partner.referral_created",
        severity: "success",
        description: `New referral via code ${refCode} — ${email}`,
        actorUserId: userId,
        actorEmail: email,
        targetUserId: partner.user_id,
        source: "auth",
        metadata: { partner_id: partner.id, ref_code: refCode },
      });
    }
  } catch (err) {
    console.error("Failed to claim partner referral:", err);
  }
}
