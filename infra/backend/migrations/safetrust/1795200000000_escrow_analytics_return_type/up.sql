-- Hasura can only track functions that return SETOF a tracked table, so
-- get_escrow_analytics_by_day (RETURNS TABLE) could not be exposed as
-- getEscrowAnalyticsByDay. This table is only the function's return type: it
-- never holds rows, and the Hasura select permission on it exposes no root
-- fields of its own.
CREATE TABLE IF NOT EXISTS public.escrow_analytics_daily (
  day        DATE   PRIMARY KEY,
  page_views BIGINT NOT NULL,
  clicks     BIGINT NOT NULL,
  users      BIGINT NOT NULL
);

COMMENT ON TABLE public.escrow_analytics_daily IS
  'Return type of get_escrow_analytics_by_day. Holds no rows.';

-- The return type changes, so the function has to be dropped, not replaced.
DROP FUNCTION IF EXISTS public.get_escrow_analytics_by_day(DATE, DATE, TEXT);

CREATE FUNCTION public.get_escrow_analytics_by_day(
  p_start_date DATE,
  p_end_date   DATE,
  p_tenant_id  TEXT DEFAULT 'safetrust'
)
RETURNS SETOF public.escrow_analytics_daily
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
