-- Restore trusted signup automation for new accounts.
-- This attaches the existing secure profile/role creation function to new auth users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Ensure agency side-effects run only when a trusted backend/admin flow adds the agency role.
DROP TRIGGER IF EXISTS on_user_roles_agency_created ON public.user_roles;

CREATE TRIGGER on_user_roles_agency_created
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agency_role();

-- Ensure direct role modifications remain blocked for non-admin browser users.
DROP TRIGGER IF EXISTS guard_user_roles_write_trigger ON public.user_roles;

CREATE TRIGGER guard_user_roles_write_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.guard_user_roles_write();