-- Seed base roles
-- id 1 = guest, 2 = host, 3 = admin — referenced by user_roles FK
INSERT INTO public.roles (id, name) VALUES
  (1, 'guest'),
  (2, 'host'),
  (3, 'admin')
ON CONFLICT (id) DO NOTHING;