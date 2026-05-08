-- bikes_public is the contract for public listings. It already filters to
-- approved+available bikes from verified, non-suspended agencies and excludes
-- sensitive columns (license_plate, notes). Running it as security_invoker
-- means anon's lack of SELECT on `agencies` causes the LEFT JOIN to drop
-- every row → empty listings. Switch to a definer-style view so the WHERE
-- clause is the sole authority on what's exposed.
ALTER VIEW public.bikes_public SET (security_invoker = false);
