import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For email signup, the referral code lives in user_metadata.
      // For Google OAuth, the signup page stashed it in localStorage and
      // the dashboard shell POSTs to /api/partner/claim-referral on mount.
      const refCode = data?.user?.user_metadata?.referral_code as string | undefined;
      if (refCode && data?.user) {
        await claimPartnerReferral(refCode, data.user.id, data.user.email || "");
      }

      // Audit sign-in events so admin sees the full activity timeline.
      // We can't easily distinguish "signup" from "signin" here (Supabase
      // returns the same payload for both after callback), so log as
      // signed_in and note the ref code if any.
      if (data?.user) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
          const admin = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
          );
          await logAuditEvent(admin, {
            eventType: "user.signed_in",
            severity: "info",
            description: refCode
              ? `Signed in (referred by ${refCode})`
              : "Signed in via OAuth callback",
            actorUserId: data.user.id,
            actorEmail: data.user.email || null,
            targetUserId: data.user.id,
            targetEmail: data.user.email || null,
            source: "auth/callback",
            metadata: { ref_code: refCode ?? null },
          });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

// Looks up the partner by code and inserts a partner_referrals row.
// Idempotent: the (partner_id, referred_user_id) UNIQUE constraint
// prevents duplicates if the user re-runs the OAuth flow.
async function claimPartnerReferral(refCode: string, userId: string, email: string) {
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
    // constraint may have skipped it if the user re-runs OAuth).
    if (!refErr) {
      await logAuditEvent(supabase, {
        eventType: "partner.referral_created",
        severity: "success",
        description: `New referral via code ${refCode} — ${email}`,
        actorUserId: userId,
        actorEmail: email,
        targetUserId: partner.user_id,
        source: "auth/callback",
        metadata: { partner_id: partner.id, ref_code: refCode },
      });
    }
  } catch (err) {
    console.error("Failed to claim partner referral:", err);
  }
}
