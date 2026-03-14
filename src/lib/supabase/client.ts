import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseUrl.startsWith("https://") || supabaseUrl.includes("your-supabase-url-here") || !supabaseAnonKey || supabaseAnonKey.includes("key-here")) {
    console.warn("Supabase environment variables are missing or invalid (URL must start with https://). Please update .env.local.");
    // Return a dummy client or handle gracefully
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}
