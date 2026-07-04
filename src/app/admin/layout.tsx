import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

// Server-side admin gate. Verifies the session and the `is_admin` flag
// BEFORE any admin page renders — a non-admin (or logged-out) visitor is
// redirected and never receives admin markup or data.
//
// This replaces the previous client-side PIN gate, which read
// `NEXT_PUBLIC_ADMIN_PIN` (shipped into the browser bundle) with a
// hardcoded fallback — a leaked secret that provided no real protection.
// The admin API routes already enforce `is_admin` with a 403; this closes
// the UI side of the same door. See docs/compliance-fixes.md (finding #4).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return <AdminShell>{children}</AdminShell>;
}
