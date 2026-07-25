-- Database-level enforcement for the two feature flags that are written to the
-- DB directly from the browser (bypassing any server route): smart-routing
-- rules on `links.redirect_rules`, and `team_settings.show_branding`.
-- App-level gates cover these paths too, but only the DB is non-bypassable.
--
-- Must match src/lib/entitlements.ts:
--   routing        free none · starter geo+device · growth/agency +time·days
--   removeBranding growth · agency only
--
-- Grandfathering: these fire only when the gated column actually changes, so a
-- downgrade never retro-breaks a link's existing rules or a team's branding —
-- the customer just can't set NEW disallowed values.

-- ── Smart routing conditions ─────────────────────────────────
create or replace function public.enforce_link_routing_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan        text;
  v_allow_smart boolean;
  v_allow_time  boolean;
  r             jsonb;
  k             text;
begin
  if NEW.redirect_rules is null
     or jsonb_typeof(NEW.redirect_rules) <> 'array'
     or jsonb_array_length(NEW.redirect_rules) = 0 then
    return NEW;
  end if;

  select plan into v_plan from public.teams where id = NEW.team_id;
  v_plan := coalesce(v_plan, 'free');
  v_allow_smart := v_plan in ('starter', 'growth', 'agency');
  v_allow_time  := v_plan in ('growth', 'agency');

  for r in select value from jsonb_array_elements(NEW.redirect_rules) as t(value) loop
    if r ? 'conditions' and jsonb_typeof(r->'conditions') = 'object' then
      for k in select jsonb_object_keys(r->'conditions') loop
        if k in ('geo', 'device', 'country') then
          if not v_allow_smart then
            raise exception 'PLAN_LIMIT: Smart routing is available on Starter and above. Upgrade to use routing rules.';
          end if;
        elsif k = 'time' then
          if not v_allow_time then
            raise exception 'PLAN_LIMIT: Time & day routing is available on Growth and above. Upgrade to use it.';
          end if;
        end if;
      end loop;
    end if;
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_link_routing_plan on public.links;
create trigger trg_enforce_link_routing_plan
  before insert or update of redirect_rules on public.links
  for each row execute function public.enforce_link_routing_plan();

-- ── Remove branding ──────────────────────────────────────────
create or replace function public.enforce_branding_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
begin
  -- Turning branding ON (the default) is always allowed; we only gate hiding it.
  if NEW.show_branding is distinct from false then
    return NEW;
  end if;

  select plan into v_plan from public.teams where id = NEW.team_id;
  if coalesce(v_plan, 'free') not in ('growth', 'agency') then
    raise exception 'PLAN_LIMIT: Removing Tappr branding is available on Growth and above. Upgrade to remove it.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_branding_plan on public.team_settings;
create trigger trg_enforce_branding_plan
  before insert or update of show_branding on public.team_settings
  for each row execute function public.enforce_branding_plan();
