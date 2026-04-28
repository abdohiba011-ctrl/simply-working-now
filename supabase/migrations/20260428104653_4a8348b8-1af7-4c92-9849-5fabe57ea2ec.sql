-- Remove default public function access, then grant only what the app needs after login.
REVOKE EXECUTE ON FUNCTION public.admin_role_sync_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_role_sync_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_bike_hold(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bike_hold(uuid, date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_hold_to_booking(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_hold_to_booking(uuid, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_plan_downgrade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_plan_downgrade() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) TO authenticated;