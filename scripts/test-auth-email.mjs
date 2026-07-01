// Local test for the Supabase "Send Email" hook without touching any
// dashboard. It forges a Supabase-shaped, Standard-Webhooks-signed request
// and POSTs it to the hook route, which renders the branded email and sends
// it through Resend — so you get a REAL email in your inbox.
//
// Prereqs:
//   1) In .env.local set a test secret (same one this script signs with):
//        SEND_EMAIL_HOOK_SECRET=v1,whsec_dGVzdHNlY3JldGtleTEyMzQ1Njc4OTA=
//   2) RESEND_API_KEY must be set (already is).
//   3) Run the dev server:  npm run dev
//   4) Run this:            node scripts/test-auth-email.mjs you@email.com recovery
//        type = signup | recovery | invite | magiclink | email_change
//
// A 200 + an email in your inbox = the whole path works.

import crypto from "crypto";

const email = process.argv[2];
const type = process.argv[3] || "recovery";
const target = process.env.HOOK_URL || "http://localhost:3000/api/auth/send-email";
const secret = process.env.SEND_EMAIL_HOOK_SECRET || "v1,whsec_dGVzdHNlY3JldGtleTEyMzQ1Njc4OTA=";

if (!email) {
  console.error("Usage: node scripts/test-auth-email.mjs <email> [type]");
  process.exit(1);
}

const body = JSON.stringify({
  user: { email },
  email_data: {
    token: "123456",
    token_hash: "test_token_hash_abc123",
    redirect_to: "https://tappr.me/auth/callback",
    email_action_type: type,
    site_url: "https://tappr.me",
  },
});

// Standard Webhooks signature: base64(HMAC-SHA256(keyBytes, `${id}.${ts}.${body}`))
const keyB64 = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
const key = Buffer.from(keyB64, "base64");
const id = "msg_test_" + Date.now();
const ts = Math.floor(Date.now() / 1000).toString();
const sig = crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");

const res = await fetch(target, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": ts,
    "webhook-signature": `v1,${sig}`,
  },
  body,
});

console.log("status:", res.status);
console.log("response:", await res.text());
console.log(res.status === 200 ? `\n✅ sent "${type}" email to ${email} — check your inbox` : "\n❌ failed — see response above");
