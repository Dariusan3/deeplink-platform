-- Per-plan numeric resource caps, enforced at the database so they cannot be
-- bypassed by calling Supabase directly (all of links/collections/team_members
-- are inserted client-side against RLS, with no server route in between).
--
-- Caps MUST match src/lib/entitlements.ts and the public /pricing page:
--   links        free 25   · starter 500 · growth 5,000 · agency unlimited
--   collections  free 5    · starter/growth/agency unlimited
--   team_members free 1    · starter 3   · growth 10    · agency unlimited
--
-- NULL from plan_resource_limit() means "Unlimited" (no ceiling).
-- On breach the trigger raises 'PLAN_LIMIT: ...'; the client detects that prefix
-- and shows a friendly "upgrade" message (see the create hooks).

create or replace function public.plan_resource_limit(p_plan text, p_resource text)
returns integer
language sql
immutable
as $$
  select case p_resource
    when 'links' then case coalesce(p_plan, 'free')
      when 'starter' then 500
      when 'growth'  then 5000
      when 'agency'  then null
      else 25
    end
    when 'collections' then case coalesce(p_plan, 'free')
      when 'starter' then null
      when 'growth'  then null
      when 'agency'  then null
      else 5
    end
    when 'team_members' then case coalesce(p_plan, 'free')
      when 'starter' then 3
      when 'growth'  then 10
      when 'agency'  then null
      else 1
    end
    else null
  end
$$;

-- SECURITY DEFINER so the count/plan lookups see every row regardless of the
-- caller's RLS view — an under-count would silently let a team exceed its cap.

create or replace function public.enforce_links_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan  text;
  v_cap   integer;
  v_count integer;
begin
  select plan into v_plan from public.teams where id = NEW.team_id;
  v_cap := public.plan_resource_limit(v_plan, 'links');
  if v_cap is null then
    return NEW;
  end if;
  select count(*) into v_count from public.links where team_id = NEW.team_id;
  if v_count >= v_cap then
    raise exception 'PLAN_LIMIT: You have reached your plan limit of % links. Upgrade to add more.', v_cap;
  end if;
  return NEW;
end;
$$;

create or replace function public.enforce_collections_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan  text;
  v_cap   integer;
  v_count integer;
begin
  select plan into v_plan from public.teams where id = NEW.team_id;
  v_cap := public.plan_resource_limit(v_plan, 'collections');
  if v_cap is null then
    return NEW;
  end if;
  select count(*) into v_count from public.collections where team_id = NEW.team_id;
  if v_count >= v_cap then
    raise exception 'PLAN_LIMIT: You have reached your plan limit of % collections. Upgrade to add more.', v_cap;
  end if;
  return NEW;
end;
$$;

create or replace function public.enforce_team_members_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan  text;
  v_cap   integer;
  v_count integer;
begin
  select plan into v_plan from public.teams where id = NEW.team_id;
  v_cap := public.plan_resource_limit(v_plan, 'team_members');
  if v_cap is null then
    return NEW;
  end if;
  select count(*) into v_count from public.team_members where team_id = NEW.team_id;
  if v_count >= v_cap then
    raise exception 'PLAN_LIMIT: You have reached your plan limit of % team member(s). Upgrade to add more.', v_cap;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_links_limit on public.links;
create trigger trg_enforce_links_limit
  before insert on public.links
  for each row execute function public.enforce_links_limit();

drop trigger if exists trg_enforce_collections_limit on public.collections;
create trigger trg_enforce_collections_limit
  before insert on public.collections
  for each row execute function public.enforce_collections_limit();

drop trigger if exists trg_enforce_team_members_limit on public.team_members;
create trigger trg_enforce_team_members_limit
  before insert on public.team_members
  for each row execute function public.enforce_team_members_limit();
