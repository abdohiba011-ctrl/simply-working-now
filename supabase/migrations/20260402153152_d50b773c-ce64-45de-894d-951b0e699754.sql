
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_user_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_resource_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_resource_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.client_timeline_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.client_trust_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS category TEXT;
