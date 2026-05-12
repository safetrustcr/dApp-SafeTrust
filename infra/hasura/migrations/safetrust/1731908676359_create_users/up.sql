CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    firebase_uid TEXT,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    country_code TEXT,
    location TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_firebase_uid ON public.users(firebase_uid);