-- 1. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-applications', 'business-applications', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Documents table
CREATE TABLE IF NOT EXISTS public.business_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('id_front','id_back','bike_photo','ownership_paper')),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bad_application ON public.business_application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_bad_user ON public.business_application_documents(user_id);

ALTER TABLE public.business_application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can insert own application docs"
ON public.business_application_documents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Applicants can view own application docs"
ON public.business_application_documents
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all application docs"
ON public.business_application_documents
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Storage policies (folder-per-user)
CREATE POLICY "Applicants upload own business app files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-applications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Applicants read own business app files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'business-applications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Applicants delete own business app files"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'business-applications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all business app files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'business-applications'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);