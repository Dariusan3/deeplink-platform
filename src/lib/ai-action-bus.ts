// Bridge between the AI's tool execution stream and the refresh-bus.
// When the chat (Brain or floating Quick AI) parses an `action` event
// from the server, it calls this function so the matching list hooks
// (use-links, use-collections) pick up the change in real time —
// without the user having to navigate or hit refresh.
//
// Mirrors the bus events the hooks themselves emit on direct mutations,
// so the UX is identical whether the user clicked a button or asked the AI.

import { emit } from "@/lib/refresh-bus";

interface AiActionResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface AiAction {
  name: string;
  args?: Record<string, unknown>;
  result: AiActionResult;
}

export function dispatchAiAction(action: AiAction): void {
  if (!action.result.ok) return; // Don't broadcast failed actions.

  const row = action.result.data;

  switch (action.name) {
    case "create_link":
      if (row) emit("links", { kind: "create", row });
      else emit("links", { kind: "refetch" });
      break;

    case "update_link":
      if (row) emit("links", { kind: "update", row });
      else emit("links", { kind: "refetch" });
      break;

    case "toggle_link_favorite":
      // Sidebar Favorites + link card star pull from the same hook.
      emit("links", { kind: "refetch" });
      break;

    case "move_link_to_collection":
      // Affects both the source link's `collection_id` and the target
      // collection's link_count derivation. Refetch both.
      emit("links", { kind: "refetch" });
      emit("collections", { kind: "refetch" });
      break;

    case "create_collection":
      if (row) emit("collections", { kind: "create", row });
      else emit("collections", { kind: "refetch" });
      break;

    // Read tools — no state change to broadcast.
    case "list_links":
    case "list_collections":
      break;

    default:
      // Unknown tool — be conservative and just nudge both.
      emit("links", { kind: "refetch" });
      emit("collections", { kind: "refetch" });
  }
}
