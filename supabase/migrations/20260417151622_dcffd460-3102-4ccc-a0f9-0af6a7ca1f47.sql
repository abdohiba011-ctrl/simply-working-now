-- Add delete_reason to client_files
ALTER TABLE public.client_files
  ADD COLUMN IF NOT EXISTS delete_reason text;

-- Add unconfirmed_at and unconfirmed_by to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS unconfirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS unconfirmed_by uuid;

-- Add downloaded_by_name to client_file_downloads (referenced in code)
ALTER TABLE public.client_file_downloads
  ADD COLUMN IF NOT EXISTS downloaded_by_name text;