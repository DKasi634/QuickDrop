-- ============================================================
-- Quick-Share Drops - Function-only creation hardening
-- This migration is safe to run after 001 if early anon policies
-- were already applied to a remote Supabase project.
-- ============================================================

DROP POLICY IF EXISTS "anon_insert_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_select_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_update_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_delete_drops" ON public.drops;

DROP POLICY IF EXISTS "anon_upload_quick_drops" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_quick_drops" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_quick_drops" ON storage.objects;
