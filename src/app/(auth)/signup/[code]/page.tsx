import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { ReferralOnboarding } from "@/components/partner/referral-onboarding";
import { normalizeCode, resolvePartnerByCode, partnerDisplayName } from "@/lib/partner-codes";

// /signup/@CODE — the partner's clean, shareable referral link.
//
// Renders the SAME signup form as /signup (no redirect, so the URL stays
// /signup/@CODE — no ?ref= ever appears), extracts the referral code from the
// path, and records the click against the partner. The signup form then carries
// the code into user metadata + localStorage, where the existing flow attributes
// the referral.
export const dynamic = "force-dynamic"; // one click recorded per real visit

function detectDevice(ua: string): string {
  const u = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(u)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(u)) return "mobile";
  return "desktop";
}

export default async function SignupWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  // Links are now /signup/CODE. The older /signup/@CODE shape is still in the
  // wild on posts and bios, so normalizeCode strips leading @ characters and
  // lowercases — a partner's code is case-insensitive, and the same
  // normalisation runs in partner_id_for_code() on the database side.
  const code = normalizeCode(raw || "");

  // Resolve the partner once: the same lookup feeds the click row and the
  // "Referred by <name>" line. Doing it here, on the server, means the visitor
  // never sees the raw code flash before a client fetch replaces it.
  let refName: string | null = null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (code && serviceKey) {
    try {
      const h = await headers();
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
      const partner = await resolvePartnerByCode(supabase, code);
      if (partner) {
        refName = await partnerDisplayName(supabase, partner.user_id);

        const country = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null;
        const device = detectDevice(h.get("user-agent") || "");
        await supabase.from("partner_referral_clicks").insert({
          partner_id: partner.id,
          country,
          device,
        });
      }
    } catch {
      // swallow — tracking must never break signup
    }
  }

  return <ReferralOnboarding refCode={code || null} refName={refName} />;
}
