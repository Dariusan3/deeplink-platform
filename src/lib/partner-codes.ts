// Partner referral code resolution and validation.
//
// A partner may hold several codes: the eight random characters generated at
// activation, plus any vanity code they have ever chosen. All of them resolve,
// forever — see supabase/migrations/028_partner_vanity_codes.sql for why none
// is ever released.
//
// Every lookup in the app goes through resolvePartnerByCode. Before this module
// existed the same `.eq("referral_code", code)` was copy-pasted into six route
// handlers, which meant a new code could work on some paths and not others.
// In a commission system that is silently lost attribution — the worst possible
// failure mode, because nobody notices until a partner asks where their money
// went.

import type { SupabaseClient } from "@supabase/supabase-js";

// Keep in step with partner_id_for_code() in migration 028. The SQL copy exists
// because the handle_new_user trigger needs the same lookup and cannot call
// TypeScript.
export function normalizeCode(raw: string): string {
  let s = raw ?? "";
  try {
    s = decodeURIComponent(s);
  } catch {
    // A malformed percent-escape is not worth failing a signup over; the
    // un-decoded string simply will not match anything.
  }
  return s.replace(/^@+/, "").trim().toLowerCase();
}

/**
 * The partner a referral code belongs to, or null.
 *
 * `supabase` must be a service-role client on any path that has to work for
 * anonymous visitors — partner_codes only exposes a partner's own rows to
 * an authenticated owner.
 */
export async function resolvePartnerByCode(
  supabase: SupabaseClient,
  raw: string
): Promise<{ id: string; user_id: string } | null> {
  const code = normalizeCode(raw);
  if (!code) return null;

  const { data } = await supabase
    .from("partner_codes")
    .select("partner_id, partner_profiles!inner(id, user_id)")
    .eq("code", code)
    .maybeSingle();

  return firstProfile(data);
}

// The generated Supabase types model an embedded relation as an array even when
// the FK guarantees at most one row, so `!inner(...)` comes back as either the
// object or a one-element array depending on the client version. Normalise once
// here rather than casting at each call site.
type EmbeddedProfile = { id: string; user_id: string };

function firstProfile(row: unknown): EmbeddedProfile | null {
  if (!row) return null;
  const embedded = (row as { partner_profiles?: EmbeddedProfile | EmbeddedProfile[] })
    .partner_profiles;
  const profile = Array.isArray(embedded) ? embedded[0] : embedded;
  return profile?.id ? { id: profile.id, user_id: profile.user_id } : null;
}

/**
 * The name to show a referred visitor: "Referred by Andrei", not
 * "Referred by nj493rrh".
 *
 * Returns null when the partner never set a name, and the caller then falls
 * back to the code. Deliberately never falls back to the email — this is read
 * through a public endpoint, and a code is a string the partner chose to
 * publish whereas their email is not.
 */
export async function partnerDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const name = (data?.full_name as string | null)?.trim();
  return name ? name : null;
}

/**
 * A fresh auto-generated code, checked for collisions against EVERY code in
 * use — not just the ones on partner_profiles. Checking only partner_profiles
 * (as both callers used to) lets a generated code collide with somebody's
 * vanity code, and the insert into partner_codes would then fail on the
 * primary key after the profile row already existed.
 */
export async function generateAutoCode(admin: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Math.random().toString(36).slice(2, 10);
    const { data } = await admin
      .from("partner_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  // Five collisions on an 8-character space means something is very wrong.
  // A longer code rather than a loop that might never terminate.
  return `p${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Register a partner's first code. Best-effort: a partner whose profile was
 * created but whose code row is missing still resolves nowhere, so this is
 * logged rather than swallowed.
 */
export async function registerPrimaryCode(
  admin: SupabaseClient,
  partnerId: string,
  code: string
): Promise<void> {
  const { error } = await admin
    .from("partner_codes")
    .insert({ code: normalizeCode(code), partner_id: partnerId, is_primary: true });
  if (error && error.code !== "23505") {
    console.error("Failed to register partner code:", error.message);
  }
}

// ── Vanity code validation ──────────────────────────────────────────────

export const CODE_MIN = 3;
export const CODE_MAX = 24;
export const CODES_PER_PARTNER = 10;

// /signup/<code> serves a real signup form, so a code that reads as an official
// page is an impersonation surface: /signup/support collects signups for a
// stranger. The word list catches the obvious ones; the `tappr` substring rule
// below catches the constructed ones like `tapprhelp` that no list can predict.
const RESERVED = new Set([
  "admin", "administrator", "support", "help", "helpdesk", "billing",
  "official", "api", "app", "auth", "login", "signin", "signup", "register",
  "dashboard", "partner", "partners", "affiliate", "affiliates", "settings",
  "account", "accounts", "security", "team", "teams", "pricing", "contact",
  "legal", "privacy", "terms", "blog", "docs", "status", "root", "system",
  "staff", "mod", "moderator", "me", "new", "null", "undefined", "test",
]);

const BLOCKED_SUBSTRING = "tappr";

// 3–24 characters, no leading or trailing hyphen.
const SHAPE = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;

export type CodeCheck = { ok: true; code: string } | { ok: false; reason: string };

/**
 * Validate a partner-chosen code.
 *
 * The input is normalised (and therefore lowercased) BEFORE any check, so
 * `Darius` and `darius` are one code. Without that, a capital letter is a
 * trivial way to squat on somebody else's name.
 */
export function validateVanityCode(raw: string): CodeCheck {
  const code = normalizeCode(raw);

  if (code.length < CODE_MIN) return { ok: false, reason: `At least ${CODE_MIN} characters.` };
  if (code.length > CODE_MAX) return { ok: false, reason: `At most ${CODE_MAX} characters.` };
  if (!SHAPE.test(code)) {
    return { ok: false, reason: "Letters, numbers and hyphens only, and it can't start or end with a hyphen." };
  }
  if (code.includes("--")) return { ok: false, reason: "No double hyphens." };
  if (RESERVED.has(code)) return { ok: false, reason: "That word is reserved." };
  if (code.includes(BLOCKED_SUBSTRING)) {
    return { ok: false, reason: "Codes can't contain “tappr”." };
  }

  return { ok: true, code };
}
