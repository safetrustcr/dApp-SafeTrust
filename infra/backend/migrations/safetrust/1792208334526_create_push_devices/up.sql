CREATE TABLE public.push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fcm_target TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT push_devices_fcm_target_key UNIQUE (fcm_target)
);

CREATE INDEX idx_push_devices_user ON public.push_devices (user_id);
