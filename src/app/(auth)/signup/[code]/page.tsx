import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";

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
  // Link is /signup/@CODE — strip the leading @ (tolerate its absence).
  const code = decodeURIComponent(raw || "").replace(/^@+/, "").trim();

  // Best-effort click tracking. Must never block or break rendering the form.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (code && serviceKey) {
    try {
      const h = await headers();
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
      const { data: partner } = await supabase
        .from("partner_profiles")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (partner) {
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

  return <SignupForm refCode={code || null} />;
}
