import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export type DbUser = Database["public"]["Tables"]["users"]["Row"];

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // First try to get the profile
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        } else if (error && error.code === "PGRST116") {
          // Profile missing, let's try to create it (self-healing)
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .upsert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || "",
              avatar_url: user.user_metadata?.avatar_url || "",
            })
            .select()
            .single();
          
          if (newProfile) {
            setProfile(newProfile);
          } else if (insertError) {
             console.error("Critical: User profile auto-creation failed:", insertError.message || insertError);
          }
        } else if (error) {
          console.error("Error fetching user profile:", error.message || error);
        }
      }
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, loading };
}
