# AI Brain: loading states

Two separate loading problems on `src/app/(dashboard)/dashboard/brain/page.tsx`.
The sidebar chat list already had a skeleton; the message pane had none.

## 1. Empty bubble while the model thinks

`sendMessage` pushes the assistant turn the instant you hit send:

```js
setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
```

So a `glass-card` bubble renders immediately with no text — just the blinking
`brain-cursor` — and stays that way until the first token streams back. On a slow
completion that is several seconds of an empty box.

**Fix:** `ThinkingSkeleton` — three pulsing lines at varying widths (92% / 78% /
45%) with staggered `animationDelay`, so it reads as prose loading rather than a
progress bar. It renders only when the last message is the assistant's, streaming
is active, the content is still empty, **and** no tool-call actions have arrived.

That last condition matters: if the model has already run a tool, `msg.actions`
is populated while `content` is still `""`. Those `ActionCard`s are real progress
and should show instead of a skeleton.

Once the first token lands, the normal prose body plus `brain-cursor` takes over.

## 2. Welcome screen flashing before a restored chat

The message pane branched on `messages.length === 0` and showed the welcome
screen: heading, stat tiles, suggested questions.

Messages are not fetched per chat — they live inside the `chats` array
(`chat.messages`). While `chatsLoading` is true and a chat id has been restored
from state, `messages` is still `[]`, so the welcome screen paints and is then
replaced by the conversation. It reads as a flash of the wrong page.

**Fix:** `MessagesSkeleton` — alternating user/assistant bubble placeholders,
shown when `chatsLoading && activeChatId && messages.length === 0`. The welcome
screen now appears only when there is genuinely no conversation.

## Checked but not changed

`renderContent` in this file **does** escape `&`, `<`, `>` before applying its
markdown rules, so the `dangerouslySetInnerHTML` here is not the stored-XSS hole
that `weekly-report.tsx` had (see `docs/analytics-truthful-metrics.md`). Verified
rather than assumed, since the two components look alike.

## Known gap

If a completion fails and `streaming` flips to false while `content` is still
empty, the skeleton disappears and an empty assistant bubble remains. That was
the behavior before this change too. Rendering an error state in that bubble is a
separate fix.

## Hydration error (separate, pre-existing)

A React hydration mismatch fired on this page: the base-ui `Tooltip` trigger's
`useId`-based id differed between the SSR and client renders
(`base-ui-_R_1pd5…` vs `base-ui-_R_75kl…`).

Ruled out as causes, one by one: my skeleton/logo edits (all below the failing
node, no hooks added to `BrainPage`); the team provider (seeded by the dashboard
layout RSC, so its localStorage path never runs); the user provider (also
seeded); the Header and notification bell (only plain conditional elements, none
calling `useId`). The `BrainPage` tree is deterministic, yet the base-ui id still
diverged — an SSR instability in base-ui 1.3.0 that I could not root-cause
further without a browser repro.

Brain was the **only** dashboard page using base-ui tooltips. The two here were
both the same thing: a "New Chat" button whose tooltip only appeared when the
button was disabled, to show the chat-limit message. Replaced both with a native
`title` attribute (conditional string), and removed the `TooltipProvider`
wrapper and the tooltip imports. The limit message still shows on hover; the
hydration error's source is gone.

If base-ui tooltips are needed elsewhere later, this SSR id issue will resurface
and needs a real fix (mounted gate, or a base-ui upgrade) rather than another
`title` swap.

## Verified

- `npx tsc --noEmit` clean
- Dev server compiles clean; `/dashboard/brain` returns 200 when authed
- Both skeletons wired: `MessagesSkeleton` at the pane branch,
  `ThinkingSkeleton` inside the assistant bubble

Not seen rendered — the page is behind auth.
