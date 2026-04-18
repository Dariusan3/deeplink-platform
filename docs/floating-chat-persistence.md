# Floating Chat → Brain Chat Persistence

## Problem
The floating Quick AI chat ([src/components/dashboard/floating-chat.tsx](../src/components/dashboard/floating-chat.tsx)) was ephemeral: conversations vanished when the popup closed or the user hit "Clear". The full Brain page ([src/app/(dashboard)/dashboard/brain/page.tsx](../src/app/(dashboard)/dashboard/brain/page.tsx)) already persists chats via [useBrainChats](../src/hooks/use-brain-chats.ts), but the floating chat never called it.

## Fix
The floating chat now auto-saves to `brain_chats` after each assistant reply completes — same pattern as the Brain page.

- Holds a `brainChatId` in state. First completed reply in a session calls `createChat()` and records the returned id. Every subsequent reply updates that chat via `updateChat()`.
- Skips the save on aborts (`AbortError`) and on empty replies.
- If the team is already at its brain-chat limit (`canCreateChat === false`), silently skips saving — no toast, because this is a background persistence. Conversations continue to work in the floating popup, just not saved.
- **Clear** button resets `brainChatId` alongside the message list, so the next conversation starts a fresh Brain chat rather than appending to the previous one.

## Result
Conversations started in the floating chat show up in the Brain page sidebar (titled from the first user message, same as native Brain chats) and can be reopened there to continue.
