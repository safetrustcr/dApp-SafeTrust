-- Role catalogue. `name` is the stable identifier consumed by the frontend
-- middleware (guest | host | admin); ids are an implementation detail.
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_name_key UNIQUE (name)
);

INSERT INTO public.roles (name, description) VALUES
    ('guest', 'Default role: can browse and book apartments'),
    ('host', 'Can list apartments and manage escrows as receiver'),
    ('admin', 'Platform administrator')
ON CONFLICT (name) DO NOTHING;

-- A user may hold several roles at once (a host is still able to book as a
-- guest). Role resolution picks the highest-privilege row, see
-- apps/frontend/src/lib/middleware/fetch-user-role.ts.
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
