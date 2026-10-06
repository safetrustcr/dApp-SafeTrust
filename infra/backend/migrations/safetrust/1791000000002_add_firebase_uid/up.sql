ALTER TABLE public.users
    ADD COLUMN firebase_uid TEXT;

UPDATE public.users
SET firebase_uid = id
WHERE firebase_uid IS NULL;

CREATE UNIQUE INDEX idx_users_firebase_uid
    ON public.users(firebase_uid)
    WHERE firebase_uid IS NOT NULL;