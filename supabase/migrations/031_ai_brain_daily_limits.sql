-- AI Brain limits tighten from "effectively unlimited" to plan-tiered:
--   free    — a real 1-hour session per UTC day (time-boxed, not count-boxed)
--   starter — 1 new conversation per UTC day
--   growth  — 10 new conversations per UTC day
--   agency  — unlimited (unchanged)
--
-- Two DIFFERENT mechanisms, because free's constraint and starter/growth's
-- constraint are different shapes:
--   - free blocks at MESSAGE time (every send, in every conversation, old or
--     new) once the day's hour is spent — see src/app/api/ai/chat/route.ts.
--   - starter/growth block only at NEW-CONVERSATION time — once you've
--     started your daily allotment of threads, you can still send unlimited
--     messages in the ones you already have open.
--
-- Before this migration, NOTHING enforced any AI Brain limit server-side.
-- src/hooks/use-brain-chats.ts disabled a "New chat" button once
-- `chats.length >= chatLimit`, comparing against a LIFETIME total (no reset,
-- ever) — but that check runs in the browser. A team could call
-- `supabase.from("brain_chats").insert(...)` directly, or hit
-- /api/ai/chat with an existing chat id, and there was nothing to stop them.
-- That would have made this whole pricing change decorative.

-- ── Free tier: 1-hour session tracking ──────────────────────────────────
-- Set once per UTC day, on the first message of that day (see the chat
-- route). Nullable — a team that has never used the Brain has no session yet.
alter table public.teams
  add column if not exists brain_session_started_at timestamptz;

comment on column public.teams.brain_session_started_at is
  'Free plan only: UTC-day timestamp of this team''s first AI Brain message today. A message is rejected once now() is more than 1 hour past this, until the UTC day rolls over. Not meaningful for paid plans, which use a per-day new-conversation cap instead (see brain_daily_chat_cap()).';

-- ── Starter/Growth: daily new-conversation cap, enforced in RLS ────────
--
-- This mirrors PlanEntitlements.brainChats in src/lib/entitlements.ts for
-- exactly the two plans that use a day-count model (starter, growth). It is
-- duplicated here, not read from TypeScript, because a Postgres policy can't
-- import a TS module — same accepted tradeoff as partner_id_for_code() in
-- migration 028 mirroring resolvePartnerByCode(). If the numbers in
-- entitlements.ts change, this function must change with them.
--
-- Returns NULL for "no daily cap" — free (which doesn't use this mechanism at
-- all) and agency (genuinely unlimited).
create or replace function public.brain_daily_chat_cap(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'starter' then 1
    when 'growth'  then 10
    else null
  end;
$$;

-- The insert policy already required owner/editor; this adds the day-count
-- check for plans that have a finite cap. `team_id` here (unqualified) is the
-- NEW row being inserted, so the subquery is "how many chats has THIS team
-- already started today" — a standard self-referential RLS rate-limit shape.
alter policy "brain_chats_insert" on public.brain_chats
  with check (
    get_team_role(team_id, auth.uid()) = any (array['owner'::text, 'editor'::text])
    and (
      brain_daily_chat_cap((select plan from public.teams where id = team_id)) is null
      or (
        select count(*) from public.brain_chats bc
         where bc.team_id = team_id
           and bc.created_at >= date_trunc('day', now() at time zone 'utc')
      ) < brain_daily_chat_cap((select plan from public.teams where id = team_id))
    )
  );
