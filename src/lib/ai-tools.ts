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
import {
  invalidateLink,
  invalidateSlugs,
  invalidateTeamRotators,
} from "@/lib/link-cache";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

// Translate raw Postgres / Supabase errors into something safe to show a
// non-technical user. The model is also instructed not to echo verbatim,
// but this is the last line of defense.
function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  const raw = error?.message || "";
  if (/invalid input syntax for type uuid/i.test(raw)) return "Couldn't identify that item. Try again.";
  if (/violates foreign key/i.test(raw)) return "That reference no longer exists.";
  if (/duplicate key/i.test(raw) || /unique constraint/i.test(raw)) return "That already exists.";
  if (/violates row-level security|permission denied/i.test(raw)) return "You don't have access to that.";
  if (/not found/i.test(raw)) return "Couldn't find that item.";
  return "Something went wrong. Please try again.";
}

// If the model passes a slug (or another identifier) instead of a UUID,
// resolve it to a real link id. Returns null if nothing matches.
async function resolveLinkId(
  ctx: ToolContext,
  candidate: string,
): Promise<string | null> {
  if (!candidate) return null;
  if (isUuid(candidate)) return candidate;
  const { data } = await ctx.supabase
    .from("links")
    .select("id")
    .eq("team_id", ctx.teamId)
    .eq("slug", candidate)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveCollectionId(
  ctx: ToolContext,
  candidate: string,
): Promise<string | null> {
  if (!candidate) return null;
  if (isUuid(candidate)) return candidate;
  const { data } = await ctx.supabase
    .from("collections")
    .select("id")
    .eq("team_id", ctx.teamId)
    .ilike("name", candidate)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
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
  {
    type: "function" as const,
    function: {
      name: "bulk_update_links",
      description:
        "Apply the same change to many links at once. Use this for requests like 'pause all my links', 'activate all paused links', 'move all links in collection X to Y'. ALWAYS confirm with the user before calling — this affects multiple links.",
      parameters: {
        type: "object",
        required: ["scope", "update"],
        properties: {
          scope: {
            type: "string",
            enum: ["all", "active", "paused", "by_collection", "by_ids"],
            description:
              "Which links to target. 'all' = every link in the team. 'active'/'paused' = filter by status. 'by_collection' = links in a specific collection (requires collection_id). 'by_ids' = explicit list (requires link_ids).",
          },
          collection_id: {
            type: "string",
            description: "Required when scope is 'by_collection'.",
          },
          link_ids: {
            type: "array",
            items: { type: "string" },
            description: "Required when scope is 'by_ids'.",
          },
          update: {
            type: "object",
            description: "Fields to set on each matching link.",
            properties: {
              is_active: { type: "boolean", description: "Pause (false) or resume (true) the matched links." },
              collection_id: {
                type: ["string", "null"],
                description: "Move matched links into this collection (or null to remove from any).",
              },
            },
          },
        },
      },
    },
  },
];

// ─── Executor ────────────────────────────────────────────────

export async function runTool(
  name: string,
  rawArgs: Record<string, unknown> | null | undefined,
  ctx: ToolContext
): Promise<ToolResult> {
  // Defensive: the model can emit `arguments: "null"` which JSON.parses to
  // null, and previously crashed with "Cannot read properties of null".
  const args: Record<string, unknown> =
    rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs) ? rawArgs : {};

  if (!ctx.teamId) return { ok: false, error: "No active team selected." };

  try {
    switch (name) {
      case "list_links": {
        const search = typeof args.search === "string" ? args.search.trim().toLowerCase() : "";
        const { data, error } = await ctx.supabase
          .from("links")
          .select("id, slug, title, destination_url, is_active, collection_id, created_at")
          .eq("team_id", ctx.teamId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) return { ok: false, error: friendlyError(error) };
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
        if (error) return { ok: false, error: friendlyError(error) };
        return { ok: true, data, summary: `Listed ${data?.length ?? 0} collections` };
      }

      case "create_link": {
        const destination = normalizeDestinationUrl(String(args.destination_url || ""));
        if (!destination) return { ok: false, error: "Please provide a destination URL." };
        const slug = args.slug ? sanitizePath(String(args.slug)) : Math.random().toString(36).slice(2, 8);
        let collectionId: string | null = null;
        if (args.collection_id) {
          collectionId = await resolveCollectionId(ctx, String(args.collection_id));
          if (!collectionId) return { ok: false, error: "Couldn't find that collection." };
        }
        const { data, error } = await ctx.supabase
          .from("links")
          .insert({
            destination_url: destination,
            slug,
            title: args.title ? String(args.title) : null,
            team_id: ctx.teamId,
            created_by: ctx.userId,
            collection_id: collectionId,
            is_active: true,
          })
          .select()
          .single();
        if (error) return { ok: false, error: friendlyError(error) };
        await invalidateLink(ctx.supabase, {
          slug: data.slug,
          collection_id: collectionId,
        });
        return {
          ok: true,
          data,
          summary: `Created link "${data.title || data.slug}" → ${data.destination_url}`,
        };
      }

      case "create_collection": {
        const collectionName = String(args.name || "").trim();
        if (!collectionName) return { ok: false, error: "Please provide a collection name." };
        const { data, error } = await ctx.supabase
          .from("collections")
          .insert({
            team_id: ctx.teamId,
            created_by: ctx.userId,
            name: collectionName,
            description: args.description ? String(args.description) : null,
            color: args.color ? String(args.color) : "#00D26A",
          })
          .select()
          .single();
        if (error) return { ok: false, error: friendlyError(error) };
        return { ok: true, data, summary: `Created collection "${data.name}"` };
      }

      case "move_link_to_collection": {
        const linkId = await resolveLinkId(ctx, String(args.link_id || ""));
        if (!linkId) return { ok: false, error: "Couldn't identify the link." };
        let collectionId: string | null = null;
        if (args.collection_id) {
          collectionId = await resolveCollectionId(ctx, String(args.collection_id));
          if (!collectionId) return { ok: false, error: "Couldn't find that collection." };
        }
        // The rotator it's leaving is only knowable before the update lands.
        const { data: before } = await ctx.supabase
          .from("links")
          .select("collection_id")
          .eq("id", linkId)
          .maybeSingle();

        const { error } = await ctx.supabase
          .from("links")
          .update({ collection_id: collectionId })
          .eq("id", linkId);
        if (error) return { ok: false, error: friendlyError(error) };

        await invalidateLink(ctx.supabase, { collection_id: before?.collection_id });
        await invalidateLink(ctx.supabase, { collection_id: collectionId });
        return {
          ok: true,
          summary: collectionId ? "Moved link to collection" : "Removed link from collection",
        };
      }

      case "update_link": {
        const linkId = await resolveLinkId(ctx, String(args.link_id || ""));
        if (!linkId) return { ok: false, error: "Couldn't identify the link." };
        const update: Record<string, unknown> = {};
        if (args.title !== undefined) update.title = String(args.title) || null;
        if (args.destination_url !== undefined)
          update.destination_url = normalizeDestinationUrl(String(args.destination_url));
        if (args.slug !== undefined) update.slug = sanitizePath(String(args.slug));
        if (args.is_active !== undefined) update.is_active = Boolean(args.is_active);
        if (args.click_goal !== undefined) update.click_goal = args.click_goal === null ? null : Number(args.click_goal);
        if (args.click_goal_period !== undefined) update.click_goal_period = String(args.click_goal_period);

        // This tool can rename the slug and pause the link, so the pre-update
        // slug has to be purged alongside the new one.
        const { data: before } = await ctx.supabase
          .from("links")
          .select("slug, collection_id")
          .eq("id", linkId)
          .maybeSingle();

        const { data, error } = await ctx.supabase
          .from("links")
          .update(update)
          .eq("id", linkId)
          .select()
          .single();
        if (error) return { ok: false, error: friendlyError(error) };

        await invalidateLink(ctx.supabase, {
          slug: before?.slug,
          collection_id: before?.collection_id,
        });
        if (data.slug !== before?.slug) await invalidateSlugs([data.slug]);
        return { ok: true, data, summary: `Updated link "${data.title || data.slug}"` };
      }

      case "toggle_link_favorite": {
        const linkId = await resolveLinkId(ctx, String(args.link_id || ""));
        if (!linkId) return { ok: false, error: "Couldn't identify the link." };
        const favorite = Boolean(args.favorite);
        const { error } = await ctx.supabase
          .from("links")
          .update({ is_favorite: favorite })
          .eq("id", linkId);
        if (error) return { ok: false, error: friendlyError(error) };
        return {
          ok: true,
          summary: favorite ? "Added link to Favorites" : "Removed link from Favorites",
        };
      }

      case "bulk_update_links": {
        const scope = String(args.scope || "");
        const update = (args.update && typeof args.update === "object" && !Array.isArray(args.update)
          ? args.update
          : {}) as Record<string, unknown>;

        const updateFields: Record<string, unknown> = {};
        if (update.is_active !== undefined) updateFields.is_active = Boolean(update.is_active);
        if (update.collection_id !== undefined) {
          if (update.collection_id === null) {
            updateFields.collection_id = null;
          } else {
            const target = await resolveCollectionId(ctx, String(update.collection_id));
            if (!target) return { ok: false, error: "Couldn't find that collection." };
            updateFields.collection_id = target;
          }
        }
        if (Object.keys(updateFields).length === 0) {
          return { ok: false, error: "Nothing to update — provide at least one field." };
        }

        let q = ctx.supabase
          .from("links")
          .update(updateFields)
          .eq("team_id", ctx.teamId);

        switch (scope) {
          case "all":
            break;
          case "active":
            q = q.eq("is_active", true);
            break;
          case "paused":
            q = q.eq("is_active", false);
            break;
          case "by_collection": {
            if (!args.collection_id) return { ok: false, error: "Specify which collection." };
            const filterColl = await resolveCollectionId(ctx, String(args.collection_id));
            if (!filterColl) return { ok: false, error: "Couldn't find that collection." };
            q = q.eq("collection_id", filterColl);
            break;
          }
          case "by_ids": {
            const ids = Array.isArray(args.link_ids) ? args.link_ids : [];
            const resolved: string[] = [];
            for (const id of ids) {
              const r = await resolveLinkId(ctx, String(id));
              if (r) resolved.push(r);
            }
            if (resolved.length === 0) return { ok: false, error: "No valid links to update." };
            q = q.in("id", resolved);
            break;
          }
          default:
            return { ok: false, error: "Pick a target: all, active, paused, by_collection, or by_ids." };
        }

        const { data, error } = await q.select("id, slug");
        if (error) return { ok: false, error: friendlyError(error) };
        const count = data?.length ?? 0;

        // Purge each touched link, plus every rotator on the team — a bulk
        // pause or move can change rotator membership, and reconstructing which
        // rotators specifically would mean snapshotting the pre-update state of
        // every matched row. See invalidateTeamRotators().
        await invalidateSlugs((data ?? []).map((l) => l.slug as string));
        if (ctx.teamId) await invalidateTeamRotators(ctx.supabase, ctx.teamId);

        let verb = "Updated";
        if (update.is_active === false) verb = "Paused";
        else if (update.is_active === true) verb = "Activated";
        else if (update.collection_id !== undefined) verb = "Moved";

        return {
          ok: true,
          data: { count },
          summary: `${verb} ${count} link${count !== 1 ? "s" : ""}`,
        };
      }

      default:
        return { ok: false, error: "That action isn't supported." };
    }
  } catch {
    // Last-resort guard — any unexpected runtime exception inside a tool
    // becomes a generic friendly message rather than a stack trace.
    return { ok: false, error: friendlyError(null) };
  }
}
