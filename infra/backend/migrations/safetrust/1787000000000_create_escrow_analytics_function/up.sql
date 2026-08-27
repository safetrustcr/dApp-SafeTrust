-- Migration: Create get_escrow_analytics_by_day stored function
-- Aggregates trustless_work_webhook_events by day for the Analytics Dashboard.
-- pageViews  = total webhook events for the day
-- clicks     = processed webhook events for the day
-- users      = distinct users with activity (last_seen) on that day

CREATE OR REPLACE FUNCTION public.get_escrow_analytics_by_day(
  p_start_date DATE,
  p_end_date   DATE,
  p_tenant_id  TEXT DEFAULT 'safetrust'
)
RETURNS TABLE (
  day        DATE,
  page_views BIGINT,
  clicks     BIGINT,
  users      BIGINT
)
LANGUAGE sql STABLE
AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS day
  ),
  event_counts AS (
    SELECT
      created_at::date AS day,
      COUNT(*)                                              AS page_views,
      COUNT(*) FILTER (WHERE processed IS TRUE)             AS clicks
    FROM public.trustless_work_webhook_events
    WHERE created_at::date BETWEEN p_start_date AND p_end_date
      AND tenant_id = p_tenant_id
    GROUP BY created_at::date
  ),
  user_counts AS (
    SELECT
      last_seen::date AS day,
      COUNT(DISTINCT id) AS users
    FROM public.users
    WHERE last_seen::date BETWEEN p_start_date AND p_end_date
    GROUP BY last_seen::date
  )
  SELECT
    ds.day,
    COALESCE(ec.page_views, 0) AS page_views,
    COALESCE(ec.clicks, 0)     AS clicks,
    COALESCE(uc.users, 0)      AS users
  FROM date_series ds
  LEFT JOIN event_counts ec ON ec.day = ds.day
  LEFT JOIN user_counts uc ON uc.day = ds.day
  ORDER BY ds.day;
$$;
