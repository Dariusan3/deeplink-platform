import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/account/delete
//
// Right to erasure (GDPR Art. 17). Permanently deletes the signed-in user's
// account and everything that hangs off it. Because the schema cascades from
// auth.users:
//
//   auth.users
//     └─ public.users            (ON DELETE CASCADE)
//          ├─ teams (created_by) (ON DELETE CASCADE)
//          │    ├─ links → link_clicks
//          │    ├─ business_brain
//          │    ├─ ig_integrations
//          │    └─ weekly_reports
//          ├─ team_members
//          └─ links (created_by)
//
// deleting the auth user removes all of it in one shot. We do this with the
// service-role key (admin API) since a user can't delete their own auth row
// with the anon key.
//
// Caveat (documented in docs/compliance-fixes.md): if the user OWNS a team that
// has other members, cascading `teams.created_by` also removes that team and
// its data. That's acceptable for the current single-owner model; revisit if
// shared team ownership becomes real.
//
// Partner/referral system: all partner_* tables cascade from users → so a
// deleted user's partner profile, referrals (incl. referred_email), earnings
// and payout history are removed too. Their referral rows on OTHER partners
// also cascade away, which correctly strips the referred person's PII. NOTE:
// this also erases a partner's own payout/earning history — if you need to
// retain financial records for accounting, see the open question in
// docs/compliance-fixes.md.
//
// REQUIRES migration 022_account_deletion_fks.sql — without it, deletion is
// BLOCKED (FK violation) for users who created collections in another team, or
// admins who granted plans. That migration switches those two FKs to SET NULL.
export async function POST() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  const user = authData?.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Best-effort: deactivate any Instagram integrations on teams this user owns
  // before the cascade, so we stop using the token immediately. The row itself
  // is removed by the cascade below.
  try {
    const { data: ownedTeams } = await admin
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("role", "owner");
    const teamIds = (ownedTeams ?? []).map((t) => t.team_id);
    if (teamIds.length > 0) {
      await admin
        .from("ig_integrations")
        .update({ is_active: false })
        .in("team_id", teamIds);
    }
  } catch {
    // Non-fatal — the cascade still removes the data. Continue to deletion.
  }

  // If this user is a partner, ANONYMISE their partner records instead of
  // letting them hard-cascade — we keep the financial history (earnings +
  // payouts) for accounting, but scrub the PII the DB can't. The profile row
  // survives because migration 023 makes partner_profiles.user_id ON DELETE
  // SET NULL; here we strip the bank/payout details and the emails of people
  // they referred. Amounts, referral code and status are preserved.
  try {
    const { data: partner } = await admin
      .from("partner_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (partner?.id) {
      await admin
        .from("partner_profiles")
        .update({ payout_method: null, anonymized_at: new Date().toISOString() })
        .eq("id", partner.id);

      // referred_email is NOT NULL — replace with a placeholder rather than null.
      await admin
        .from("partner_referrals")
        .update({ referred_email: "[deleted]" })
        .eq("partner_id", partner.id);
    }
  } catch {
    // Non-fatal — proceed with deletion. (Worst case the FK SET NULL still
    // detaches the profile; only the PII scrub is skipped, so log-and-continue.)
  }

  // Delete the auth user → cascades to all public tables above.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }

  // Clear the session cookies for this browser.
  await ssr.auth.signOut();

  return NextResponse.json({ ok: true });
}
