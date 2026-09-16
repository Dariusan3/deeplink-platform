import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";
import { sendPartnerWelcomeEmail } from "@/lib/email";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";
import { generateAutoCode, registerPrimaryCode } from "@/lib/partner-codes";

// POST /api/admin/users/create
//
// Admin-only: creates a full, working account for someone who was never
// going to sign up through the normal invite-gated flow — a hire, a press
// contact, a VIP. One request does everything a self-service signup plus an
// admin's follow-up clicks would otherwise take four separate steps for:
//
//   1. Create the auth.users row via the Supabase admin API, with the
//      password set and the email pre-confirmed (no confirmation email sent
//      — an admin handing someone a password IS the verification).
//   2. Flip signup_status to 'ok'. handle_new_user (migration 029) still
//      fires on this insert like any other, and since there is no referral
//      code in user_metadata it defaults the row to 'pending_referral' —
//      which would leave an admin-created "full access" account stuck behind
//      the referral gate. Setting it back is safe specifically BECAUSE this
//      runs as service_role: guard_signup_status only reverts changes made as
//      anon/authenticated (see migration 029), so this is the one path that
//      trigger is designed to let through.
//   3. Create their first team (self-serve signup has no auto-team either —
//      a brand-new account owns zero teams until someone creates one; see
//      TeamProvider.createTeam for the client-side equivalent this mirrors).
//   4. Grant a plan, via the same `subscriptions` insert grant-plan.ts uses —
//      not a direct `teams.plan` write, so sync_team_plan stays the single
//      place that column is ever set from.
//   5. Optionally activate partner status, via the same steps
//      partner/activate.ts uses.
//
// Every one of steps 2-5 is exactly what already exists elsewhere in the
// admin panel — this route composes them, it doesn't reimplement them.

const VALID_PLANS = ["free", "starter", "growth", "agency"] as const;
type Plan = (typeof VALID_PLANS)[number];
const MIN_PASSWORD_LENGTH = 8;

function nameToSlug(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "team"}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  const caller = authData?.user;
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await ssr
    .from("users")
    .select("is_admin, email")
    .eq("id", caller.id)
    .single();
  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const body = await request.json().catch(() => ({}));
  const {
    email,
    password,
    full_name,
    plan = "free",
    make_partner = false,
  } = body as {
    email?: string;
    password?: string;
    full_name?: string;
    plan?: Plan;
    make_partner?: boolean;
  };

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const displayName = full_name?.trim() || cleanEmail.split("@")[0];

  // 1. Create the account. email_confirm: true — an admin handing someone a
  // password directly is itself the verification step; there is no inbox to
  // confirm from.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message || "Failed to create account" },
      { status: 500 }
    );
  }
  const userId = created.user.id;

  // 2. Release the referral gate. handle_new_user already ran (it's a DB
  // trigger on auth.users, fired synchronously by the insert above) and set
  // signup_status to 'pending_referral' since this account carries no
  // referral code — undo that now that an admin has vouched for it directly.
  await admin.from("users").update({ signup_status: "ok" } as never).eq("id", userId);

  // 3. First team, owned by them.
  const teamName = `${displayName}'s Team`;
  const { data: team, error: teamErr } = await admin
    .from("teams")
    .insert({ name: teamName, slug: nameToSlug(teamName), created_by: userId })
    .select()
    .single();
  if (teamErr || !team) {
    return NextResponse.json(
      { error: `Account created, but team creation failed: ${teamErr?.message}` },
      { status: 500 }
    );
  }
  await admin.from("team_members").insert({ team_id: team.id, user_id: userId, role: "owner" });

  // 4. Plan — same shape as /api/admin/grant-plan, open-ended (no expiry).
  // Free needs no subscriptions row; teams.plan already defaults to 'free'.
  if (plan !== "free") {
    const { error: subErr } = await admin.from("subscriptions").insert({
      team_id: team.id,
      plan,
      status: "active",
      is_free: true,
      granted_by: caller.id,
      starts_at: new Date().toISOString(),
      expires_at: null,
      notes: `Granted at account creation by admin (${callerProfile.email})`,
    });
    if (subErr) {
      return NextResponse.json(
        { error: `Account and team created, but plan grant failed: ${subErr.message}` },
        { status: 500 }
      );
    }
    // sync_team_plan (trigger on subscriptions) pushes plan -> teams.plan.
  }

  // 5. Partner — same shape as /api/admin/partner/activate.
  let partnerCode: string | null = null;
  if (make_partner) {
    const referralCode = await generateAutoCode(admin);
    const { data: partnerProfile, error: partnerErr } = await admin
      .from("partner_profiles")
      .insert({
        user_id: userId,
        referral_code: referralCode,
        commission_rate: PARTNER_COMMISSION_RATE,
        activated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (partnerErr) {
      return NextResponse.json(
        { error: `Account, team and plan set up, but partner activation failed: ${partnerErr.message}` },
        { status: 500 }
      );
    }
    await registerPrimaryCode(admin, partnerProfile.id, referralCode);
    await admin
      .from("users")
      .update({ is_partner: true, partner_activated_at: new Date().toISOString() })
      .eq("id", userId);
    partnerCode = referralCode;

    sendPartnerWelcomeEmail({
      to: cleanEmail,
      name: displayName,
      referralUrl: `${request.nextUrl.origin}/signup/${referralCode}`,
    }).catch((err) => console.error("Partner welcome email failed:", err));
  }

  await logAuditEvent(admin, {
    eventType: "admin.created_user",
    severity: "info",
    description: `Admin created an account for ${cleanEmail} (${plan}${make_partner ? ", partner" : ""})`,
    actorUserId: caller.id,
    actorEmail: callerProfile.email,
    targetUserId: userId,
    targetEmail: cleanEmail,
    teamId: team.id,
    source: "api:/admin/users/create",
    // Never store the password — only that the account was created this way.
    metadata: { method: "admin_created", plan, make_partner, team_id: team.id },
  });

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: cleanEmail, full_name: displayName },
    team: { id: team.id, name: team.name, plan },
    partnerCode,
  });
}
