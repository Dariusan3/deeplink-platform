import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/entitlements";

interface ApiAuthResult {
  teamId: string;
  userId: string;
  keyId: string;
}

export async function authenticateApiKey(
  request: Request
): Promise<ApiAuthResult | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith("dl_")) {
    return Response.json(
      { error: "Invalid API key format" },
      { status: 401 }
    );
  }

  // Hash the provided key
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const supabase = await createClient();

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("id, team_id, user_id, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!apiKey.is_active) {
    return Response.json({ error: "API key is inactive" }, { status: 401 });
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return Response.json({ error: "API key has expired" }, { status: 401 });
  }

  // Plan gate: the Developer API is a paid feature (Growth and above). A key
  // minted while on a higher plan must stop working after a downgrade, so this
  // is checked on every request, not just at key creation.
  const { data: team } = await supabase
    .from("teams")
    .select("plan")
    .eq("id", apiKey.team_id)
    .single();
  if (!hasFeature(team?.plan, "developerApi")) {
    return Response.json(
      { error: "The Developer API is available on the Growth plan and above. Upgrade to use it." },
      { status: 403 }
    );
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then();

  return {
    teamId: apiKey.team_id,
    userId: apiKey.user_id,
    keyId: apiKey.id,
  };
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Rate limit exceeded. Max 120 requests per minute." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": "120",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(
          Date.now() + 60000
        ).toISOString(),
      },
    }
  );
}
