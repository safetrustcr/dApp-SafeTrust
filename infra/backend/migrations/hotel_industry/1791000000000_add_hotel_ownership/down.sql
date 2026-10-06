DROP INDEX IF EXISTS public.idx_hotels_owner_id;

ALTER TABLE public.hotels
    DROP COLUMN IF EXISTS owner_id;