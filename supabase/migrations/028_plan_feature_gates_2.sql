-- Database-level enforcement for the remaining feature flags whose resources
-- are written to the DB directly from the browser (RLS-only, no server route),
-- so app-level guards alone are bypassable:
--   * rotator collections  (collections.is_rotator = true)  → trafficRotator (Starter+)
--   * A/B tests            (ab_tests insert)                 → trafficRotator (Starter+)
--   * API keys             (api_keys insert)                 → developerApi   (Growth+)
--
-- Must match src/lib/entitlements.ts. Grandfathering: the rotator trigger fires
-- only when is_rotator actually changes, so a downgrade never retro-disables an
-- existing rotator — the customer just can't turn NEW ones on.

-- ── Rotator collections ──────────────────────────────────────
create or replace function public.enforce_rotator_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
begin
  if NEW.is_rotator is not true then
    return NEW;
  end if;
  select plan into v_plan from public.teams where id = NEW.team_id;
  if coalesce(v_plan, 'free') not in ('starter', 'growth', 'agency') then
    raise exception 'PLAN_LIMIT: Traffic rotator is available on Starter and above. Upgrade to use it.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_rotator_plan on public.collections;
create trigger trg_enforce_rotator_plan
  before insert or update of is_rotator on public.collections
  for each row execute function public.enforce_rotator_plan();

-- ── A/B tests (split testing) ────────────────────────────────
create or replace function public.enforce_ab_test_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.teams where id = NEW.team_id;
  if coalesce(v_plan, 'free') not in ('starter', 'growth', 'agency') then
    raise exception 'PLAN_LIMIT: Split testing is available on Starter and above. Upgrade to create A/B tests.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_ab_test_plan on public.ab_tests;
create trigger trg_enforce_ab_test_plan
  before insert on public.ab_tests
  for each row execute function public.enforce_ab_test_plan();

-- ── Developer API keys ───────────────────────────────────────
create or replace function public.enforce_api_key_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.teams where id = NEW.team_id;
  if coalesce(v_plan, 'free') not in ('growth', 'agency') then
    raise exception 'PLAN_LIMIT: The Developer API is available on Growth and above. Upgrade to create API keys.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_api_key_plan on public.api_keys;
create trigger trg_enforce_api_key_plan
  before insert on public.api_keys
  for each row execute function public.enforce_api_key_plan();
