ALTER TABLE public.bookings DISABLE TRIGGER bookings_protect_sensitive_fields_trg;
ALTER TABLE public.bookings DISABLE TRIGGER bookings_restrict_user_updates_trg;

UPDATE public.bookings b
   SET booking_status = 'pending',
       status         = 'pending',
       payment_status = 'paid',
       platform_fee_paid_amount_mad = COALESCE(b.platform_fee_paid_amount_mad, 10),
       assigned_to_business = COALESCE(
         b.assigned_to_business,
         (SELECT bt.owner_id
            FROM public.bikes bk
            JOIN public.bike_types bt ON bt.id = bk.bike_type_id
           WHERE bk.id = b.bike_id)
       ),
       updated_at = now()
 WHERE b.id = '428cf18f-64f4-4ff7-bc60-2850c8b58f4c';

ALTER TABLE public.bookings ENABLE TRIGGER bookings_protect_sensitive_fields_trg;
ALTER TABLE public.bookings ENABLE TRIGGER bookings_restrict_user_updates_trg;