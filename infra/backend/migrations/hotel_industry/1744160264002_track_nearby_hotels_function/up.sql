-- Nearby search: meters via geography; Hasura-trackable (SETOF a tracked table).
-- Parameter is named p_location_area (not location_area) so it can't be
-- confused with hotel_industry.hotels.location_area inside the query body.
CREATE OR REPLACE FUNCTION hotel_industry.find_nearby_hotels(
    lat              DOUBLE PRECISION,
    lng              DOUBLE PRECISION,
    radius_meters    DOUBLE PRECISION,
    p_location_area  TEXT DEFAULT NULL
)
RETURNS SETOF hotel_industry.hotels
LANGUAGE sql STABLE AS $$
  SELECT h.*
    FROM hotel_industry.hotels h
   WHERE h.coordinates IS NOT NULL
     AND ST_DWithin(
           h.coordinates::geography,
           ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
           radius_meters)
     AND (p_location_area IS NULL OR h.location_area = p_location_area)
   ORDER BY h.coordinates::geography <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
$$;
