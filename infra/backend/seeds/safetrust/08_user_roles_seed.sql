-- Seed user roles for demo users
-- demo-tenant-uid-001 (John Smith / john_s@gmail.com) → guest
-- demo-owner-uid-002  (Alberto Casas / albertoCasas100@gmail.com) → host

INSERT INTO public.user_roles (user_id, role_id) VALUES
  ('demo-tenant-uid-001', 1),  -- guest
  ('demo-owner-uid-002',  2)   -- host
ON CONFLICT DO NOTHING;