-- Hasura can only track functions that return SETOF a tracked table, so
-- get_top_rooms_by_reservations (RETURNS TABLE) could not be tracked. This
-- table is only the function's return type and never holds rows.
CREATE TABLE IF NOT EXISTS hotel_industry.top_room_reservations (
    room_id           UUID          PRIMARY KEY,
    room_number       VARCHAR(10)   NOT NULL,
    hotel_name        VARCHAR(100)  NOT NULL,
    reservation_count BIGINT        NOT NULL,
    total_revenue     NUMERIC(12,2) NOT NULL
);

COMMENT ON TABLE hotel_industry.top_room_reservations IS
  'Return type of get_top_rooms_by_reservations. Holds no rows.';

-- The return type changes, so the function has to be dropped, not replaced.
DROP FUNCTION IF EXISTS hotel_industry.get_top_rooms_by_reservations(VARCHAR, VARCHAR);

CREATE FUNCTION hotel_industry.get_top_rooms_by_reservations(
    time_period VARCHAR DEFAULT 'all',
    filter_status VARCHAR DEFAULT NULL
)
RETURNS SETOF hotel_industry.top_room_reservations AS $$
DECLARE
    date_filter TIMESTAMPTZ;
BEGIN
    IF time_period NOT IN ('week', 'month', 'year', 'all') THEN
        RAISE EXCEPTION 'Invalid time_period. Must be one of: week, month, year, all';
    END IF;

    CASE time_period
        WHEN 'week' THEN
            date_filter := NOW() - INTERVAL '1 week';
        WHEN 'month' THEN
            date_filter := NOW() - INTERVAL '1 month';
        WHEN 'year' THEN
            date_filter := NOW() - INTERVAL '1 year';
        ELSE
            date_filter := '1970-01-01'::TIMESTAMPTZ;
    END CASE;

    RETURN QUERY
    SELECT
        r.room_id,
        r.room_number,
        h.name AS hotel_name,
        COUNT(res.id) AS reservation_count,
        COALESCE(SUM(res.total_amount), 0)::NUMERIC(12,2) AS total_revenue
    FROM hotel_industry.rooms r
    INNER JOIN hotel_industry.hotels h ON r.hotel_id = h.id
    LEFT JOIN hotel_industry.reservations res ON r.room_id = res.room_id
        AND res.created_at >= date_filter
        AND (filter_status IS NULL OR res.reservation_status = filter_status)
    GROUP BY r.room_id, r.room_number, h.name
    HAVING COUNT(res.id) > 0
    ORDER BY reservation_count DESC, total_revenue DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;
