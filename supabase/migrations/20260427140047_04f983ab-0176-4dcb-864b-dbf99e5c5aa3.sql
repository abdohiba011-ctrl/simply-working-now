-- The guard_user_roles_write trigger only allows service_role/supabase_admin/postgres
-- to modify user_roles freely. Set the role explicitly so migrations bypass the guard.
SET LOCAL ROLE postgres;

INSERT INTO public.user_roles (user_id, role)
SELECT ae.user_id, 'admin'::public.app_role
FROM public.admin_employees ae
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('4e6fd364-966c-4bdf-82cf-6805f2ee7634', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;