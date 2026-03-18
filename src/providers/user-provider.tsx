"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export type DbUser = Database["public"]["Tables"]["users"]["Row"];

interface UserContextType {
  user: User | null;
  profile: DbUser | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        } else if (error && error.code === "PGRST116") {
          // Profile missing, let's try to create it
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

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(data);
    }
  }, [user, supabase]);

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
