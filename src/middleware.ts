import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Protect admin routes — must be logged in AND is_admin = true
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect partner routes — must be logged in AND is_partner = true
  if (request.nextUrl.pathname.startsWith("/partner")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_partner")
      .eq("id", user.id)
      .single();

    if (!profile?.is_partner) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages and the marketing
  // landing — they get the dashboard directly. Skip the redirect on `/`
  // when there's a `?ref=<code>` so partner-link visits keep tracking
  // even if the visitor is already a logged-in Tappr user.
  const isLandingForAuthedUser =
    request.nextUrl.pathname === "/" &&
    !request.nextUrl.searchParams.has("ref");

  if (
    user &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup") ||
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
