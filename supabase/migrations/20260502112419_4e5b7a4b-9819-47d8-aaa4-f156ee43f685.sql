
ALTER TABLE public.user_roles DISABLE TRIGGER USER;

DELETE FROM public.user_roles
 WHERE user_id = 'b144c472-9774-4f18-9835-0aa0725a8e55'
   AND role = 'renter'::public.app_role;

ALTER TABLE public.user_roles ENABLE TRIGGER USER;
