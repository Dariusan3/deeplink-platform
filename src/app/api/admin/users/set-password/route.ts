import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";

// POST /api/admin/users/set-password
//
// Admin-only. Sets a new password for any user via the Supabase admin API
// (service role). This is a sensitive action, so it: (1) verifies the caller
// is an admin server-side, (2) never logs the password itself, and (3) writes
// an audit_log entry recording who changed whose password.
//
// Body: { userId: string, newPassword: string }

const MIN_PASSWORD_LENGTH = 8;

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

  let body: { userId?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  const newPassword = body.newPassword || "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Look up the target's email for the audit trail before changing anything.
  const { data: target } = await admin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to set password" },
      { status: 500 }
    );
  }

  await logAuditEvent(admin, {
    eventType: "admin.reset_password",
    severity: "warning",
    description: `Admin set a new password for ${target?.email ?? userId}`,
    actorUserId: caller.id,
    actorEmail: callerProfile.email,
    targetUserId: userId,
    targetEmail: target?.email ?? null,
    source: "api:/admin/users/set-password",
    // Never store the password. Only record that it happened.
    metadata: { method: "admin_override" },
  });

  return NextResponse.json({ ok: true });
}
