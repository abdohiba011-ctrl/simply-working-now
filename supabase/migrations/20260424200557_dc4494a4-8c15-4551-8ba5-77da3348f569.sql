
-- 1. Extend agency_subscriptions
ALTER TABLE public.agency_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

-- 2. Trigger to auto-start a 30-day Pro trial when an 'agency' role is granted
CREATE OR REPLACE FUNCTION public.handle_new_agency_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role::text = 'agency' THEN
    INSERT INTO public.agency_subscriptions (
      user_id, plan, status, trial_ends_at, current_period_start
    )
    VALUES (
      NEW.user_id, 'pro', 'trialing', now() + interval '30 days', now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_role_agency_assigned ON public.user_roles;
CREATE TRIGGER on_user_role_agency_assigned
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agency_role();

-- 3. Lifecycle enforcement function
CREATE OR REPLACE FUNCTION public.enforce_subscription_lifecycle()
RETURNS TABLE(transitioned_to_past_due int, transitioned_to_locked int, reminders_due int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_past_due int := 0;
  v_locked int := 0;
  v_reminders int := 0;
BEGIN
  -- trialing -> past_due (trial expired)
  WITH upd AS (
    UPDATE public.agency_subscriptions
       SET status = 'past_due',
           grace_period_ends_at = now() + interval '3 days',
           updated_at = now()
     WHERE status = 'trialing'
       AND trial_ends_at IS NOT NULL
       AND trial_ends_at < now()
     RETURNING 1
  )
  SELECT count(*) INTO v_past_due FROM upd;

  -- past_due -> locked (grace expired)
  WITH upd AS (
    UPDATE public.agency_subscriptions
       SET status = 'locked',
           locked_at = now(),
           plan = 'free',
           updated_at = now()
     WHERE status = 'past_due'
       AND grace_period_ends_at IS NOT NULL
       AND grace_period_ends_at < now()
     RETURNING 1
  )
  SELECT count(*) INTO v_locked FROM upd;

  -- count reminders due (trial ends within 5 days, no reminder yet)
  SELECT count(*) INTO v_reminders
  FROM public.agency_subscriptions
  WHERE status = 'trialing'
    AND trial_reminder_sent_at IS NULL
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at > now()
    AND trial_ends_at < now() + interval '5 days';

  RETURN QUERY SELECT v_past_due, v_locked, v_reminders;
END;
$$;

-- 4. Update public bikes RLS to hide locked agencies' bikes
DROP POLICY IF EXISTS "Public can view available bikes" ON public.bikes;
CREATE POLICY "Public can view available bikes"
ON public.bikes
FOR SELECT
TO anon, authenticated
USING (
  available = true
  AND EXISTS (
    SELECT 1 FROM public.bike_types bt
    WHERE bt.id = bikes.bike_type_id
      AND COALESCE(bt.is_approved, true) = true
      AND COALESCE(bt.business_status, 'active') = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.agency_subscriptions s
        WHERE s.user_id = bt.owner_id
          AND s.status = 'locked'
      )
  )
);
