import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";
import { claimPartnerReferral } from "@/lib/auth-referral";
import type { EmailOtpType } from "@supabase/supabase-js";

// Verifies email-link tokens (signup confirm, password recovery, invite,
// magic link, email change). The branded emails from /api/auth/send-email
// point here with `token_hash` + `type`. We verify the OTP server-side
// (which sets the session cookies) and then route deterministically:
//   recovery / invite → /reset-password (user sets a password)
//   everything else    → /dashboard
// This avoids depending on Supabase's redirect-URL allowlist, which — when a
// redirect_to doesn't match — silently falls back to the Site URL and dumps
// the user on the dashboard instead of the reset form.

function defaultNextFor(type: EmailOtpType | null): string {
  if (type === "recovery" || type === "invite") return "/reset-password";
  return "/dashboard";
}

// Only allow relative, same-origin paths to prevent open redirects.
function safeNext(raw: string | null, type: EmailOtpType | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return defaultNextFor(type);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), type);

  if (token_hash && type) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data?.user) {
      // On email signup the referral code lives in user_metadata — claim it
      // now that the account is confirmed.
      if (type === "signup") {
        const refCode = data.user.user_metadata?.referral_code as string | undefined;
        if (refCode) {
          await claimPartnerReferral(refCode, data.user.id, data.user.email || "");
        }
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
          const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
          await logAuditEvent(admin, {
            eventType: "user.signed_up",
            severity: "info",
            description: refCode ? `Confirmed signup (referred by ${refCode})` : "Confirmed email signup",
            actorUserId: data.user.id,
            actorEmail: data.user.email || null,
            targetUserId: data.user.id,
            targetEmail: data.user.email || null,
            source: "auth/confirm",
            metadata: { ref_code: refCode ?? null, type },
          });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const base = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_or_expired_link`);
}
