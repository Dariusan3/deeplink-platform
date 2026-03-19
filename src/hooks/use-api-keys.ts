"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useUser } from "./use-user";
import { useTeam } from "./use-team";
import { toast } from "sonner";

type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];

export function useApiKeys() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchApiKeys = useCallback(async () => {
    if (!activeTeam?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error.message);
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const generateApiKey = useCallback(async (name?: string) => {
    if (!user || !activeTeam) throw new Error("Authentication required");

    // Generate a random API key: dl_<32 random chars>
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const rawKey = `dl_${Array.from(randomBytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 32)}`;
    const keyPrefix = rawKey.slice(0, 8);

    // Hash the key for storage using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: apiKey, error } = await supabase
      .from("api_keys")
      .insert({
        team_id: activeTeam.id,
        user_id: user.id,
        name: name || "Default API Key",
        key_hash: keyHash,
        key_prefix: keyPrefix,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating API key:", error.message);
      toast.error("Failed to create API key");
      throw error;
    }

    setApiKeys((prev) => [apiKey, ...prev]);
    toast.success("API key generated");

    // Return the raw key — this is the only time it's visible
    return { ...apiKey, raw_key: rawKey };
  }, [user, activeTeam, supabase]);

  const revokeApiKey = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error revoking API key:", error.message);
      toast.error("Failed to revoke API key");
      throw error;
    }

    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key revoked");
  }, [supabase]);

  return { apiKeys, loading, generateApiKey, revokeApiKey, refetch: fetchApiKeys };
}
