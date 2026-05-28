"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
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

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function init() {
      // Read the session from local storage (instant) instead of getUser()
      // which makes a network round-trip to Supabase's auth server. The
      // session user is enough to start fetching the user's data; route
      // protection is enforced server-side by middleware (getUser) and every
      // query is RLS-scoped, so client-side getSession is safe here.
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      // Unblock downstream providers (teams → links → stats) immediately —
      // the profile fetch below is not on the critical path.
      setLoading(false);

      if (!sessionUser) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionUser.id)
        .single();

      if (data) {
        setProfile(data);
      } else if (error && error.code === "PGRST116") {
        // Profile missing, let's try to create it
        const { data: newProfile, error: insertError } = await supabase
          .from("users")
          .upsert({
            id: sessionUser.id,
            email: sessionUser.email!,
            full_name: sessionUser.user_metadata?.full_name || "",
            avatar_url: sessionUser.user_metadata?.avatar_url || "",
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

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User | null } | null) => {
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
