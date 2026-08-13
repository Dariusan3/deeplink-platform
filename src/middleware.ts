import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Referral gate ───────────────────────────────────────────────────────
//
// Signup is referral-only. Because account creation happens client-side against
// Supabase with the public anon key, we gate ACCESS rather than REGISTRATION:
// an account with `signup_status = 'pending_referral'` exists but can reach
// nothing until a valid code is attached. See migration 029 for the full
// reasoning and for the trigger that stops an account releasing itself.
//
// A deny-list, not an allow-list. Marketing pages, /login, /auth/* and the
// referral links themselves must never be caught by a gate that is trying to
// protect the product surface — an allow-list that forgets one public route
// locks visitors out of the landing page.
const GATED_PREFIXES = ["/dashboard", "/partner", "/admin"];

// API routes a quarantined account still needs: the two that let it get out,
// plus click tracking, which is harmless and keeps partner stats honest.
const GATE_ALLOWED_API = [
  "/api/partner/claim-referral",
  "/api/partner/validate-code",
  "/api/partner/track-click",
];

function isGated(pathname: string): boolean {
  if (GATED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/api")) {
    return !GATE_ALLOWED_API.some((p) => pathname.startsWith(p));
  }
  return false;
}

export default async function middleware(request: NextRequest) {
  // Note: canonical host redirect (www.tappr.me → tappr.me) is handled at
  // the Vercel domain config layer. Doing it here too caused a redirect
  // loop when Vercel was configured to redirect bare → www at the same time.
  // Configure: Vercel → Project → Settings → Domains → set tappr.me as the
  // primary (no redirect) and www.tappr.me to redirect to tappr.me.

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseUrl.startsWith("https://") || supabaseUrl.includes("your-supabase-url-here") || !supabaseAnonKey || supabaseAnonKey.includes("key-here")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - important for Server Components.
  //
  // `getClaims()` rather than `getUser()`: this middleware runs on every
  // request that matches the config below — including each RSC navigation and
  // prefetch — and `getUser()` paid a network round-trip to Supabase Auth every
  // single time, which sat in front of every sidebar page transition.
  //
  // Security is unchanged. Our project signs JWTs with an asymmetric key
  // (ES256, see /auth/v1/.well-known/jwks.json), so getClaims() verifies the
  // token's signature locally against the cached JWK — a forged or tampered
  // token still fails. It calls getSession() underneath, so expired tokens are
  // still refreshed and the rotated cookies still flow through setAll() above.
  // If the project were ever migrated back to a symmetric (HS256) secret,
  // getClaims() falls back to getUser() on its own — it never trusts an
  // unverified token.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { pathname } = request.nextUrl;
  const needsAdmin = pathname.startsWith("/admin");
  const needsPartner = pathname.startsWith("/partner");

  if (!user && (needsAdmin || needsPartner)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // One profile read covers all three checks below. These used to be two
  // separate selects for /admin and /partner; the referral gate needs a third
  // column on far more paths, so merging them keeps it at one round trip.
  let profile: { is_admin?: boolean; is_partner?: boolean; signup_status?: string } | null = null;
  if (user && (needsAdmin || needsPartner || isGated(pathname) || pathname.startsWith("/signup"))) {
    const { data, error } = await supabase
      .from("users")
      .select("is_admin, is_partner, signup_status")
      .eq("id", user.id)
      .single();

    if (error) {
      // If migration 029 has not run yet, selecting signup_status errors and
      // takes is_admin/is_partner down with it — which would lock admins and
      // partners out of their own sections during the deploy window. Retry
      // without the new column; the gate then reads as 'ok', which is the
      // correct behaviour for a database that does not have the gate yet.
      const { data: legacy } = await supabase
        .from("users")
        .select("is_admin, is_partner")
        .eq("id", user.id)
        .single();
      profile = legacy;
    } else {
      profile = data;
    }
  }

  // Referral gate. Checked before the role checks so a quarantined account is
  // sent to /welcome rather than bounced to a dashboard it also cannot see.
  //
  // `signup_status` is absent (undefined) until migration 029 has run — treat
  // that as 'ok' so deploying the code before the migration cannot lock
  // everybody out.
  const quarantined = profile?.signup_status === "pending_referral";

  if (quarantined) {
    // A signed-in quarantined user clicking a referral link should claim the
    // code, not be offered a second signup form. /welcome does the claim.
    if (pathname.startsWith("/signup/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      url.search = `?code=${encodeURIComponent(pathname.slice("/signup/".length))}`;
      return NextResponse.redirect(url);
    }
    if (isGated(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (needsAdmin && !profile?.is_admin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (needsPartner && !profile?.is_partner) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages and the marketing
  // landing — they get the dashboard directly. Skip the redirect on `/`
  // when there's a `?ref=<code>` so partner-link visits keep tracking
  // even if the visitor is already a logged-in Tappr user.
  //
  // Quarantined accounts are exempt: sending them to /dashboard would bounce
  // them straight back to /welcome, which is why the gate screen is its own
  // route rather than a state of /signup.
  const isLandingForAuthedUser =
    pathname === "/" && !request.nextUrl.searchParams.has("ref");

  if (
    user &&
    !quarantined &&
    (pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      isLandingForAuthedUser)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
