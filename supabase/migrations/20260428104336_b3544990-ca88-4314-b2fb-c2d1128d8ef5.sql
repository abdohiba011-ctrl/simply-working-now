DROP TRIGGER IF EXISTS guard_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS on_user_role_created ON public.user_roles;

DROP TRIGGER IF EXISTS guard_user_roles_write_trigger ON public.user_roles;
CREATE TRIGGER guard_user_roles_write_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.guard_user_roles_write();

DROP TRIGGER IF EXISTS on_user_roles_agency_created ON public.user_roles;
CREATE TRIGGER on_user_roles_agency_created
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agency_role();