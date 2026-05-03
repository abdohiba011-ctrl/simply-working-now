
REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_draft_to_pending(uuid, integer, integer) FROM authenticated;
-- service_role retains EXECUTE; the payment webhook edge function calls this
-- using the service role key. No other code path may promote draft -> pending.
