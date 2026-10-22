CREATE OR REPLACE FUNCTION public.serialize_push_device_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Device registration is low volume; a transaction lock also serializes
  -- global token ownership moves across users.
  PERFORM pg_advisory_xact_lock(1792417007133::BIGINT);
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_devices_serialize_registration
BEFORE INSERT OR UPDATE OF user_id, last_seen_at
ON public.push_devices
FOR EACH ROW
EXECUTE FUNCTION public.serialize_push_device_registration();

CREATE OR REPLACE FUNCTION public.prune_push_devices_for_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.push_devices
  WHERE id IN (
    SELECT id
    FROM public.push_devices
    WHERE user_id = NEW.user_id
    ORDER BY last_seen_at DESC, created_at DESC, id DESC
    OFFSET 10
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER push_devices_prune_owner
AFTER INSERT OR UPDATE OF user_id, last_seen_at
ON public.push_devices
FOR EACH ROW
EXECUTE FUNCTION public.prune_push_devices_for_owner();

WITH ranked_devices AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY last_seen_at DESC, created_at DESC, id DESC
  ) AS position
  FROM public.push_devices
)
DELETE FROM public.push_devices
WHERE id IN (SELECT id FROM ranked_devices WHERE position > 10);
