ALTER TABLE public.hotels
    ADD COLUMN owner_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT;

CREATE INDEX idx_hotels_owner_id ON public.hotels(owner_id);