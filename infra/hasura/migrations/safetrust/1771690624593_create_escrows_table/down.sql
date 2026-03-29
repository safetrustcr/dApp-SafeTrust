DROP TRIGGER IF EXISTS escrows_set_updated_at ON public.escrows;
DROP FUNCTION IF EXISTS public.set_escrows_updated_at();
DROP TABLE IF EXISTS public.escrows CASCADE;
