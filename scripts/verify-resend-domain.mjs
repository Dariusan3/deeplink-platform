// Triggers Resend domain verification for tappr.me and polls until it's
// verified (or fails). Run AFTER adding the DNS records at Hostinger:
//   node scripts/verify-resend-domain.mjs
// Reads RESEND_API_KEY from .env.local automatically.

import { readFileSync } from "fs";

const DOMAIN_ID = "47a44a01-10b2-4a3d-9bc0-3c129ab124ff"; // tappr.me

let key = process.env.RESEND_API_KEY;
if (!key) {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    key = env.match(/^RESEND_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {}
}
if (!key) {
  console.error("RESEND_API_KEY not found");
  process.exit(1);
}

const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const trig = await fetch(`https://api.resend.com/domains/${DOMAIN_ID}/verify`, {
  method: "POST",
  headers: H,
});
console.log("verification triggered:", trig.status);

for (let i = 0; i < 30; i++) {
  const res = await fetch(`https://api.resend.com/domains/${DOMAIN_ID}`, { headers: H });
  const d = await res.json();
  const recs = (d.records || []).map((r) => `${r.type}/${r.name}: ${r.status}`).join("  |  ");
  console.log(`[${i + 1}/30] domain: ${d.status}   ${recs}`);
  if (d.status === "verified") {
    console.log("\n✅ tappr.me VERIFIED — emails now deliver to any address.");
    process.exit(0);
  }
  if (d.status === "failed") {
    console.log("\n❌ verification FAILED — a record is wrong/missing. Check the table in docs/auth-emails-and-google-oauth.md");
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 20_000));
}
console.log("\n⏳ still pending — DNS propagation can take up to a few hours. Re-run this script later.");
