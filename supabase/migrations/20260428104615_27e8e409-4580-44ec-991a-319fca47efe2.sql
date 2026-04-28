-- Trigger-only helpers: used internally by database automation, not callable from browser sessions.
REVOKE EXECUTE ON FUNCTION public.sync_admin_role_to_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_enforce_canonical_price() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_protect_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_restrict_user_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.booking_messages_restrict_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_booking_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_sync_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_agency_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_roles_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Service-only helpers: only backend functions using service credentials may call these.
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_renter_wallet(uuid, numeric, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Signed-out visitors should not call authenticated-only RPCs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_role_sync_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_bike_hold(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_hold_to_booking(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_booking(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_plan_downgrade() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) FROM anon;