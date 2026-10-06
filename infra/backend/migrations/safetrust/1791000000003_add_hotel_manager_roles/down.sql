DELETE FROM public.user_roles
WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('MANAGER', 'STAFF'));

DELETE FROM public.roles WHERE name IN ('MANAGER', 'STAFF');