
DROP TRIGGER IF EXISTS profiles_sync_name_trg ON public.profiles;
DROP TRIGGER IF EXISTS profiles_sync_name_trg ON public.profiles;

CREATE TRIGGER profiles_sync_name_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_name();
