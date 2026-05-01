# AI Brain — Actions / Tool Calling

The Brain is now agentic. It can read AND mutate the user's links and collections via a server-side tool registry, with the user's Supabase session attached so RLS scopes everything to their team.

## Tools (in [src/lib/ai-tools.ts](../src/lib/ai-tools.ts))

| Tool | Purpose |
|---|---|
| `list_links` | Read team's links (optionally filtered by substring). Used to find IDs by title before mutating. |
| `list_collections` | Read team's collections. |
| `create_link` | Insert a new link. URL is normalized via `normalizeDestinationUrl`, slug is sanitized via `sanitizePath`. |
| `create_collection` | Insert a new collection (name + optional description/color). |
| `move_link_to_collection` | Reassign a link's `collection_id` (null = unassign). |
| `update_link` | Partial update — title, destination_url, slug, is_active, click_goal, click_goal_period. |
| `toggle_link_favorite` | Star / unstar in sidebar. |

Read tools auto-execute. Write tools execute too (no per-call confirmation), but the system prompt instructs the model to confirm in plain English before destructive moves; the model usually asks before delete-like actions.

## Tool-call loop (in [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts))

1. Server receives the conversation + analytics context.
2. Calls Groq (`llama-3.3-70b-versatile`) with `tools` + `tool_choice: "auto"`, **non-streaming**.
3. If the response contains `tool_calls` → execute each via `runTool()`, append results back into the conversation, **loop** (max 5 hops).
4. Once the model returns a plain text answer (no tool calls), send that text via the stream and close.

The loop cap (`MAX_TOOL_HOPS = 5`) prevents runaway models from chaining forever.

## Wire protocol (NDJSON)

The previous protocol streamed raw text. Now each line is a self-contained JSON object:

```jsonc
{"type":"text","value":"Sure — I'll create that link for you."}
{"type":"action","name":"create_link","args":{"destination_url":"https://shop.io"},"result":{"ok":true,"data":{...},"summary":"Created link \"Summer Promo\""}}
```

Client buffers partial lines across chunk boundaries and parses each complete line. Text events feed the typewriter buffer; action events are appended to `collectedActions[]` and rendered as inline cards in the message bubble.

## UI ([src/app/(dashboard)/dashboard/brain/page.tsx](../src/app/(dashboard)/dashboard/brain/page.tsx))

The assistant message type is extended to `DisplayMessage = ChatMessage & { actions?: ActionEvent[] }`. Each action renders as an `<ActionCard />` ABOVE the model's text:

- Green border + ✓ Action label on success, with the tool's human-readable summary
- Red border + ✗ Failed on error, with the error message
- Collapsible `<details>` to inspect the args JSON when needed

Actions are runtime-only — they're NOT serialized into the persisted `brain_chats.messages` JSONB to keep the DB shape stable. If you need to audit what the AI did, add a `brain_actions` table later.

## Example interactions

- **"Create a link to https://summer-promo.com called Summer Promo"** → `create_link` → action card + "Done — link `tappr.me/<slug>` is live."
- **"Move my Summer Promo link into the Marketing collection"** → `list_links` (search "summer") → `list_collections` → `move_link_to_collection` → action card.
- **"Show me my links"** → `list_links` → AI summarizes the data in the text reply (the action card just confirms the read happened).
- **"Pause my /promo link"** → `list_links` → `update_link({is_active: false})` → action card.

## Safety / limits

- **No delete tool yet.** Add `delete_link` later only after a confirmation flow exists in the UI; right now the AI cannot accidentally drop data.
- **Rate.** Each tool hop is a Groq call. Long chains cost more tokens. Cap of 5 keeps a single user turn under ~6 model calls total.
- **RLS.** Every tool runs with the user's session — they can only touch links/collections in teams they're a member of.
- **Sanitization.** `create_link` and `update_link` route URLs through `normalizeDestinationUrl` and slugs through `sanitizePath`, so the AI can't smuggle invalid characters or `http://` into the DB.
