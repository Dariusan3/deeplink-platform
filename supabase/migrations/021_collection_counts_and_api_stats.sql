-- (1) Per-collection link counts via a single GROUP BY, replacing the
-- N+1 `link_count:links(count)` correlated subquery the collections hook
-- used. Mirrors the existing team_link_click_counts sibling.
CREATE OR REPLACE FUNCTION public.team_collection_link_counts(p_team_id uuid)
RETURNS TABLE(collection_id uuid, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.collection_id, count(*)::bigint
  FROM public.links l
  WHERE l.team_id = p_team_id
    AND l.collection_id IS NOT NULL
  GROUP BY l.collection_id;
$function$;

-- (2) Server-side aggregation for the public /api/v1/stats endpoint so it
-- stops pulling every raw click row + aggregating in JS, and avoids the
-- redundant second count query. Daily buckets are UTC (the API contract),
-- referrer keeps the full hostname (no www stripping) to match prior output.
CREATE OR REPLACE FUNCTION public.api_team_stats(
  p_team_id uuid,
  p_days    int DEFAULT 30,
  p_link_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link_ids uuid[];
  v_since    timestamptz := now() - make_interval(days => p_days);
  v_total    bigint;
  v_result   jsonb;
BEGIN
  SELECT array_agg(id) INTO v_link_ids
  FROM public.links
  WHERE team_id = p_team_id
    AND (p_link_id IS NULL OR id = p_link_id);

  IF v_link_ids IS NULL OR array_length(v_link_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'total_clicks', 0, 'clicks_in_period', 0, 'daily_counts', '[]'::jsonb,
      'top_countries', '[]'::jsonb, 'top_devices', '[]'::jsonb, 'top_referrers', '[]'::jsonb
    );
  END IF;

  SELECT count(*)::bigint INTO v_total
  FROM public.link_clicks
  WHERE link_id = ANY(v_link_ids);

  WITH c AS (
    SELECT clicked_at, country, device_type, referer
    FROM public.link_clicks
    WHERE link_id = ANY(v_link_ids)
      AND clicked_at >= v_since
  ),
  daily AS (
    SELECT to_char((clicked_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
           count(*)::bigint AS count
    FROM c GROUP BY 1
  ),
  countries AS (
    SELECT coalesce(country, 'Unknown') AS country, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC LIMIT 10
  ),
  devices AS (
    SELECT coalesce(device_type, 'unknown') AS device, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC
  ),
  referrers AS (
    SELECT (CASE
      WHEN referer IS NULL THEN 'Direct'
      ELSE coalesce(substring(referer from '^[A-Za-z]+://([^/]+)'), referer)
    END) AS referrer, count(*)::bigint AS count
    FROM c GROUP BY 1 ORDER BY count DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'total_clicks', v_total,
    'clicks_in_period', (SELECT count(*) FROM c),
    'daily_counts',  coalesce((SELECT jsonb_agg(jsonb_build_object('date', date, 'count', count) ORDER BY date) FROM daily), '[]'::jsonb),
    'top_countries', coalesce((SELECT jsonb_agg(jsonb_build_object('country', country, 'count', count) ORDER BY count DESC) FROM countries), '[]'::jsonb),
    'top_devices',   coalesce((SELECT jsonb_agg(jsonb_build_object('device', device, 'count', count) ORDER BY count DESC) FROM devices), '[]'::jsonb),
    'top_referrers', coalesce((SELECT jsonb_agg(jsonb_build_object('referrer', referrer, 'count', count) ORDER BY count DESC) FROM referrers), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
