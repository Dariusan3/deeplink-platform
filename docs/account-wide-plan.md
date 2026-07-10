# Account-wide plan

## Decision

A plan follows the **account**, not a single team. A paid subscription applies
to every team its owner created (`teams.created_by`). One subscription covers all
of that user's workspaces. Teams a user only belongs to (owned by someone else)
are unaffected.

## The problem

Everything was per-team:
- `subscriptions.team_id` — a subscription belongs to one team.
- `sync_team_plan` (migration 009): on an active subscription, it ran
  `UPDATE teams SET plan = NEW.plan WHERE id = NEW.team_id` — the one team.
- `teams.plan` defaults to `'free'` (migration 004).

So paying on one team left the owner's other teams — and every team they created
afterwards — on `free`. `getBrainChatLimit(activeTeam?.plan)` and the ~10 other
`activeTeam.plan` reads then showed free limits on those teams.

## The change — migration `024_account_wide_plan.sql`

All server-side; no app code changes. `teams.plan` stays the authoritative field
every read already uses, it is just kept in sync across a user's teams.

1. **`plan_rank(text)`** — orders `free < starter < growth < agency`, matching
   `BRAIN_CHAT_LIMITS` in `src/lib/plan-limits.ts`. Defines "best plan".
2. **`owner_best_plan(uuid)`** — the highest-tier plan among a user's active,
   non-expired subscriptions (over the teams they created); `'free'` if none.
3. **`sync_team_plan()` rewritten** — on any subscription insert/update, recompute
   the owner's best plan and apply it to **all** teams they created. This also
   downgrades on cancellation/expiry, which the upgrade-only original never did.
4. **`inherit_owner_plan()` — new `BEFORE INSERT` trigger on `teams`** — a new
   team inherits its owner's current best plan. `BEFORE INSERT` so the row
   returned by `createTeam().select()` already has the right plan (no refetch).
5. **Backfill** — aligns every existing team to its owner's best plan.

### Why it needs no app change

`createTeam` and the auto-create in `fetchTeams` both `.insert(...).select()`, so
they receive the trigger-set plan. Every consumer keeps reading `activeTeam.plan`.

## Not applied yet

I could not reach the database this session (the Supabase connector returned
"You do not have permission" on both reads and writes), so I did not apply or
verify it live. Apply it yourself:

```bash
supabase db push          # or run the file in the SQL editor
```

Or via MCP once the connector has write access:
`apply_migration(project_id="xovmaoicmzhvfsbgnhgg", name="account_wide_plan", query=<file contents>)`.

### Verify after applying

```sql
-- No owner should have teams on more than one plan.
SELECT created_by, array_agg(DISTINCT plan) AS plans
FROM teams GROUP BY created_by
HAVING array_length(array_agg(DISTINCT plan), 1) > 1;   -- expect 0 rows

-- Each team's plan should equal its owner's best plan.
SELECT count(*) AS mismatches
FROM teams t
WHERE t.plan IS DISTINCT FROM owner_best_plan(t.created_by);  -- expect 0
```

Then, in the app: on a paid account, create a new team — it should open on the
paid plan, and the AI Brain chat limit should match.

## Out of scope

- **Multiple active subscriptions** for one owner: the highest tier wins. No
  proration or seat math — teams are workspaces under one plan.
- **Cancellation revert timing**: teams downgrade when the subscription row flips
  to a non-active status (or expires and the row is updated). If a subscription
  just passes `expires_at` with no row update, nothing re-runs the trigger; a
  scheduled sweep or a read-time check would close that, but that gap predates
  this change.

## Related
- `supabase/migrations/009_admin_and_subscriptions.sql` (original per-team trigger)
- `docs/brain-loading-skeletons.md` (the hydration error that surfaced the
  plan-per-team behavior)
