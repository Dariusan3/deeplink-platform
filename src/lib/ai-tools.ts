// Tool registry for the AI Brain — exposes a curated set of mutations
// that the model can call. Each tool runs server-side with the user's
// Supabase session so RLS naturally scopes everything to the active team.
//
// Read tools (search, list) auto-execute. Write tools (create, update,
// delete) also execute server-side but the response includes a structured
// "action" record the UI shows as a confirmation card after the fact —
// users always see what the AI did. We avoid destructive defaults: the
// system prompt instructs the model to ASK before delete or paused-link
// reactivation.

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDestinationUrl, sanitizePath } from "@/lib/url-normalize";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  teamId: string | null;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  // Human-readable summary for the action card the UI renders.
  summary?: string;
}

// ─── Tool schemas (Groq / OpenAI compatible) ──────────────────

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_links",
      description:
        "List the team's links. Use this to find a link by title or slug before performing other actions. Returns up to 50 links sorted by most recent.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Optional case-insensitive substring to filter title/slug/destination.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_collections",
      description: "List the team's collections.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_link",
      description:
        "Create a new short link. Always confirm with the user the destination URL and title before calling. Slug is auto-generated if omitted.",
      parameters: {
        type: "object",
        required: ["destination_url"],
        properties: {
          destination_url: { type: "string", description: "Full URL the link should redirect to." },
          title: { type: "string", description: "Internal title (not visible to visitors)." },
          slug: { type: "string", description: "Custom path. Auto-generated if omitted." },
          collection_id: { type: "string", description: "Optional collection UUID to assign the link to." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_collection",
      description: "Create a new collection (link group).",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          color: { type: "string", description: "Hex color like #00D26A. Optional." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "move_link_to_collection",
      description:
        "Assign a link to a collection (or pass null collection_id to remove from any collection).",
      parameters: {
        type: "object",
        required: ["link_id"],
        properties: {
          link_id: { type: "string" },
          collection_id: {
            type: ["string", "null"],
            description: "Collection UUID, or null to unassign.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_link",
      description:
        "Update fields on an existing link. Only the provided fields change.",
      parameters: {
        type: "object",
        required: ["link_id"],
        properties: {
          link_id: { type: "string" },
          title: { type: "string" },
          destination_url: { type: "string" },
          slug: { type: "string", description: "New custom path." },
          is_active: { type: "boolean", description: "Pause or resume the link." },
          click_goal: { type: ["number", "null"] },
          click_goal_period: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_link_favorite",
      description: "Star or un-star a link in the sidebar Favorites.",
      parameters: {
        type: "object",
        required: ["link_id", "favorite"],
        properties: {
          link_id: { type: "string" },
          favorite: { type: "boolean" },
        },
      },
    },
  },
];

// ─── Executor ────────────────────────────────────────────────

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  if (!ctx.teamId) return { ok: false, error: "No active team in session." };

  switch (name) {
    case "list_links": {
      const search = typeof args.search === "string" ? args.search.trim().toLowerCase() : "";
      let query = ctx.supabase
        .from("links")
        .select("id, slug, title, destination_url, is_active, collection_id, created_at")
        .eq("team_id", ctx.teamId)
        .order("created_at", { ascending: false })
        .limit(50);
      const { data, error } = await query;
      if (error) return { ok: false, error: error.message };
      const filtered = search
        ? (data || []).filter((l: { title?: string | null; slug: string; destination_url: string }) => {
            const t = `${l.title || ""} ${l.slug} ${l.destination_url}`.toLowerCase();
            return t.includes(search);
          })
        : data;
      return { ok: true, data: filtered, summary: `Listed ${filtered?.length ?? 0} links` };
    }

    case "list_collections": {
      const { data, error } = await ctx.supabase
        .from("collections")
        .select("id, name, description, color")
        .eq("team_id", ctx.teamId)
        .order("created_at", { ascending: false });
      if (error) return { ok: false, error: error.message };
      return { ok: true, data, summary: `Listed ${data?.length ?? 0} collections` };
    }

    case "create_link": {
      const destination = normalizeDestinationUrl(String(args.destination_url || ""));
      if (!destination) return { ok: false, error: "destination_url is required." };
      const slug = args.slug ? sanitizePath(String(args.slug)) : Math.random().toString(36).slice(2, 8);
      const { data, error } = await ctx.supabase
        .from("links")
        .insert({
          destination_url: destination,
          slug,
          title: args.title ? String(args.title) : null,
          team_id: ctx.teamId,
          created_by: ctx.userId,
          collection_id: args.collection_id ? String(args.collection_id) : null,
          is_active: true,
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        data,
        summary: `Created link "${data.title || data.slug}" → ${data.destination_url}`,
      };
    }

    case "create_collection": {
      const name = String(args.name || "").trim();
      if (!name) return { ok: false, error: "name is required." };
      const { data, error } = await ctx.supabase
        .from("collections")
        .insert({
          team_id: ctx.teamId,
          created_by: ctx.userId,
          name,
          description: args.description ? String(args.description) : null,
          color: args.color ? String(args.color) : "#00D26A",
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, data, summary: `Created collection "${data.name}"` };
    }

    case "move_link_to_collection": {
      const linkId = String(args.link_id || "");
      if (!linkId) return { ok: false, error: "link_id is required." };
      const collectionId = args.collection_id ? String(args.collection_id) : null;
      const { error } = await ctx.supabase
        .from("links")
        .update({ collection_id: collectionId })
        .eq("id", linkId);
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        summary: collectionId
          ? `Moved link to collection`
          : `Removed link from collection`,
      };
    }

    case "update_link": {
      const linkId = String(args.link_id || "");
      if (!linkId) return { ok: false, error: "link_id is required." };
      const update: Record<string, unknown> = {};
      if (args.title !== undefined) update.title = String(args.title) || null;
      if (args.destination_url !== undefined)
        update.destination_url = normalizeDestinationUrl(String(args.destination_url));
      if (args.slug !== undefined) update.slug = sanitizePath(String(args.slug));
      if (args.is_active !== undefined) update.is_active = Boolean(args.is_active);
      if (args.click_goal !== undefined) update.click_goal = args.click_goal === null ? null : Number(args.click_goal);
      if (args.click_goal_period !== undefined) update.click_goal_period = String(args.click_goal_period);
      const { data, error } = await ctx.supabase
        .from("links")
        .update(update)
        .eq("id", linkId)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, data, summary: `Updated link "${data.title || data.slug}"` };
    }

    case "toggle_link_favorite": {
      const linkId = String(args.link_id || "");
      const favorite = Boolean(args.favorite);
      const { error } = await ctx.supabase
        .from("links")
        .update({ is_favorite: favorite })
        .eq("id", linkId);
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        summary: favorite ? "Added link to Favorites" : "Removed link from Favorites",
      };
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
