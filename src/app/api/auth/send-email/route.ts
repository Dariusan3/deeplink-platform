import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendAuthEmail, type EmailActionType } from "@/lib/auth-emails";

export const runtime = "nodejs";

// Supabase Auth "Send Email" hook. When enabled, Supabase stops sending its
// default emails and POSTs the event here instead, so we render our own
// branded HTML and deliver it via Resend.
//
// Configure in Supabase → Authentication → Hooks → "Send Email":
//   URL:    https://tappr.me/api/auth/send-email
//   Secret: (Supabase generates it — store as SEND_EMAIL_HOOK_SECRET)
//
// The request is signed with the Standard Webhooks scheme:
//   signed = `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   sig    = base64( HMAC-SHA256(secretBytes, signed) )
// and the `webhook-signature` header carries space-separated `v1,<sig>` items.

const SECRET = process.env.SEND_EMAIL_HOOK_SECRET || "";
// Supabase presents the secret as `v1,whsec_<base64>`. The signing key is the
// base64-decoded portion after the `whsec_` prefix.
const secretBytes = (() => {
  if (!SECRET) return null;
  const b64 = SECRET.replace(/^v1,/, "").replace(/^whsec_/, "");
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
})();

function verify(id: string, timestamp: string, body: string, header: string): boolean {
  if (!secretBytes) return false;
  const signed = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);
  // Header is a space-separated list like "v1,<sig> v1,<sig2>".
  for (const part of header.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

interface HookPayload {
  user: { email?: string };
  email_data: {
    token_hash: string;
    token?: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_hash_new?: string;
  };
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");

  if (!secretBytes) {
    console.error("SEND_EMAIL_HOOK_SECRET not configured");
    return NextResponse.json(
      { error: { http_code: 500, message: "email hook not configured" } },
      { status: 500 }
    );
  }
  if (!id || !timestamp || !signature || !verify(id, timestamp, raw, signature)) {
    return NextResponse.json(
      { error: { http_code: 401, message: "invalid signature" } },
      { status: 401 }
    );
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(raw) as HookPayload;
  } catch {
    return NextResponse.json(
      { error: { http_code: 400, message: "bad payload" } },
      { status: 400 }
    );
  }

  const to = payload.user?.email;
  const ed = payload.email_data;
  if (!to || !ed?.email_action_type) {
    return NextResponse.json(
      { error: { http_code: 400, message: "missing email or action type" } },
      { status: 400 }
    );
  }

  const type = ed.email_action_type;

  try {
    if (type === "reauthentication") {
      // OTP flow — no link, just the 6-digit code.
      await sendAuthEmail({ to, type, code: ed.token });
    } else {
      // Point the link at our own /auth/confirm route (verifyOtp with the
      // token_hash), which routes deterministically — recovery/invite land on
      // /reset-password, everything else on /dashboard. This avoids the
      // Supabase redirect-URL allowlist fallback that dumped recovery users on
      // the dashboard instead of the password form.
      const base = process.env.NEXT_PUBLIC_APP_URL || ed.site_url || "https://tappr.me";
      const tokenHash = ed.token_hash_new || ed.token_hash;
      const next = type === "recovery" || type === "invite" ? "/reset-password" : "/dashboard";
      const actionUrl =
        `${base}/auth/confirm` +
        `?token_hash=${encodeURIComponent(tokenHash)}` +
        `&type=${encodeURIComponent(type)}` +
        `&next=${encodeURIComponent(next)}`;
      await sendAuthEmail({ to, type, actionUrl });
    }
  } catch (err) {
    console.error("Failed to send auth email:", err);
    return NextResponse.json(
      { error: { http_code: 500, message: "failed to send email" } },
      { status: 500 }
    );
  }

  // 200 with empty body tells Supabase the email was handled.
  return NextResponse.json({});
}
