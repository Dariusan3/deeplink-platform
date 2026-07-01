import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";
import { claimPartnerReferral } from "@/lib/auth-referral";

// This route handles the OAuth (Google) PKCE flow — a `code` query param that
// gets exchanged for a session. Email-link verification (signup / recovery /
// invite, which arrive as a `token_hash`) is handled by /auth/confirm.
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
