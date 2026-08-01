-- Lower the FREE plan link cap from 25 to 5.
--
-- The cap is enforced by public.plan_resource_limit(), called from the
-- enforce_links_limit() BEFORE INSERT trigger (migration 026). Redefining the
-- function here updates enforcement everywhere it's used. Only the 'links' /
-- free branch changes (25 -> 5); every other resource and plan is unchanged.
--
-- App-side display + entitlements were updated in the same change:
--   src/lib/entitlements.ts (free.links = 5) and the pricing surfaces.

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
      else 5
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
