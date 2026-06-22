-- Server-side analytics aggregation so the analytics page (and AI brain
-- context) stop fetching every raw link_clicks row and aggregating in JS.
-- Mirrors the JS logic in src/hooks/use-analytics.ts: tz-bucketed daily +
-- hourly, top-10 geo/referrers/top-links, full device/browser breakdowns.
CREATE OR REPLACE FUNCTION public.dashboard_analytics(
  p_team_id       uuid,
  p_tz            text DEFAULT 'UTC',
  p_start         timestamptz DEFAULT NULL,
  p_end           timestamptz DEFAULT NULL,
  p_collection_id uuid DEFAULT NULL,
  p_link_id       uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link_ids uuid[];
  v_result   jsonb;
BEGIN
  -- Elevated roles (SQL editor, service role) skip the auth check —
  -- normal app calls still go through is_team_member.
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF auth.uid() IS NULL OR NOT public.is_team_member(p_team_id, auth.uid()) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  -- Resolve the link set server-side, honoring the same precedence as the
  -- client: a specific link wins over a collection filter, else all team links.
  SELECT array_agg(id) INTO v_link_ids
  FROM public.links
  WHERE team_id = p_team_id
    AND (p_link_id IS NULL OR id = p_link_id)
    AND (p_collection_id IS NULL OR collection_id = p_collection_id);

  IF v_link_ids IS NULL OR array_length(v_link_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'total_clicks', 0, 'daily', '[]'::jsonb, 'geo', '[]'::jsonb,
      'device', '[]'::jsonb, 'referrers', '[]'::jsonb, 'top_links', '[]'::jsonb,
      'browsers', '[]'::jsonb, 'hourly', '[]'::jsonb
    );
  END IF;

  WITH c AS (
    SELECT clicked_at, country, device_type, referer, link_id, user_agent
    FROM public.link_clicks
    WHERE link_id = ANY(v_link_ids)
      AND (p_start IS NULL OR clicked_at >= p_start)
      AND (p_end   IS NULL OR clicked_at <  p_end)
  ),
  daily AS (
    SELECT to_char((clicked_at AT TIME ZONE p_tz)::date, 'YYYY-MM-DD') AS date,
           count(*)::bigint AS count
    FROM c GROUP BY 1
  ),
  geo AS (
    SELECT coalesce(country, 'Unknown') AS country, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC LIMIT 10
  ),
  device AS (
    SELECT coalesce(device_type, 'unknown') AS device_type, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC
  ),
  referrers AS (
    SELECT (CASE
      WHEN referer IS NULL THEN 'Direct'
      ELSE coalesce(
        regexp_replace(substring(referer from '^[A-Za-z]+://([^/]+)'), '^www\.', ''),
        referer
      )
    END) AS domain, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC LIMIT 10
  ),
  top_links AS (
    SELECT l.id, l.slug, l.title, cc.count
    FROM (SELECT link_id, count(*)::bigint AS count FROM c GROUP BY link_id) cc
    JOIN public.links l ON l.id = cc.link_id
    ORDER BY cc.count DESC LIMIT 10
  ),
  browsers AS (
    SELECT (CASE
      WHEN strpos(coalesce(user_agent, ''), 'Instagram') > 0 THEN 'Instagram'
      WHEN strpos(coalesce(user_agent, ''), 'Edg') > 0 THEN 'Edge'
      WHEN strpos(coalesce(user_agent, ''), 'Chrome') > 0 AND strpos(coalesce(user_agent, ''), 'Edg') = 0 THEN 'Chrome'
      WHEN strpos(coalesce(user_agent, ''), 'Safari') > 0 AND strpos(coalesce(user_agent, ''), 'Chrome') = 0 THEN 'Safari'
      WHEN strpos(coalesce(user_agent, ''), 'Firefox') > 0 THEN 'Firefox'
      WHEN strpos(coalesce(user_agent, ''), 'Opera') > 0 OR strpos(coalesce(user_agent, ''), 'OPR') > 0 THEN 'Opera'
      WHEN strpos(coalesce(user_agent, ''), 'Google') > 0 THEN 'Google App'
      WHEN strpos(coalesce(user_agent, ''), 'FBAN') > 0 OR strpos(coalesce(user_agent, ''), 'FBAV') > 0 THEN 'Facebook'
      WHEN strpos(coalesce(user_agent, ''), 'Snapchat') > 0 THEN 'Snapchat'
      WHEN strpos(coalesce(user_agent, ''), 'Twitter') > 0 THEN 'Twitter/X'
      WHEN strpos(coalesce(user_agent, ''), 'TikTok') > 0 THEN 'TikTok'
      ELSE 'Other'
    END) AS browser, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC
  ),
  hourly AS (
    SELECT extract(hour FROM (clicked_at AT TIME ZONE p_tz))::int AS hour,
           count(*)::bigint AS count
    FROM c GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total_clicks', (SELECT count(*) FROM c),
    'daily',     coalesce((SELECT jsonb_agg(jsonb_build_object('date', date, 'count', count) ORDER BY date) FROM daily), '[]'::jsonb),
    'geo',       coalesce((SELECT jsonb_agg(jsonb_build_object('country', country, 'count', count) ORDER BY count DESC) FROM geo), '[]'::jsonb),
    'device',    coalesce((SELECT jsonb_agg(jsonb_build_object('device_type', device_type, 'count', count) ORDER BY count DESC) FROM device), '[]'::jsonb),
    'referrers', coalesce((SELECT jsonb_agg(jsonb_build_object('domain', domain, 'count', count) ORDER BY count DESC) FROM referrers), '[]'::jsonb),
    'top_links', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'title', title, 'count', count) ORDER BY count DESC) FROM top_links), '[]'::jsonb),
    'browsers',  coalesce((SELECT jsonb_agg(jsonb_build_object('browser', browser, 'count', count) ORDER BY count DESC) FROM browsers), '[]'::jsonb),
    'hourly',    coalesce((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'count', count) ORDER BY hour) FROM hourly), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
