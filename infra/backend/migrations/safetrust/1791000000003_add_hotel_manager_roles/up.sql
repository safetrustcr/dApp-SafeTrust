INSERT INTO public.roles (name, description) VALUES
    ('MANAGER', 'Manages hotels and hotel operations'),
    ('STAFF', 'Works at a manager-owned hotel')
ON CONFLICT (name) DO NOTHING;