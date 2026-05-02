
-- Private backup bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('motonita-backups', 'motonita-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins only
CREATE POLICY "Admins can read backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'motonita-backups' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can write backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'motonita-backups' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'motonita-backups' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- backup_runs table
CREATE TABLE IF NOT EXISTS public.backup_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running','success','failed')),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('daily','manual')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  file_path TEXT,
  file_size BIGINT,
  error_message TEXT,
  manifest JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_started_at ON public.backup_runs(started_at DESC);

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup runs"
ON public.backup_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert backup runs"
ON public.backup_runs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Edge function and service-role writes are not blocked by RLS (service role bypasses).

-- Enable pg_cron and pg_net for scheduling (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
