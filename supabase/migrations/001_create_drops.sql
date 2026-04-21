-- ============================================================
-- Quick-Share Drops - Database Schema, Policies, and RPC
-- Run this in the Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Drops metadata table
CREATE TABLE IF NOT EXISTS public.drops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_code TEXT UNIQUE NOT NULL,
  file_path TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'text')),
  text_content TEXT,
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  view_limit INTEGER,
  views_count INTEGER DEFAULT 0 NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_drops_drop_code ON public.drops(drop_code);
CREATE INDEX IF NOT EXISTS idx_drops_expires_at ON public.drops(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_code_format'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_code_format
      CHECK (drop_code ~ '^[a-z0-9]+(-[a-z0-9]+){1,3}$' AND length(drop_code) <= 64);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_caption_length'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_caption_length
      CHECK (caption IS NULL OR char_length(caption) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_text_length'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_text_length
      CHECK (text_content IS NULL OR char_length(text_content) <= 20000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_view_limit_bounds'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_view_limit_bounds
      CHECK (view_limit IS NULL OR view_limit = 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_views_count_nonnegative'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_views_count_nonnegative
      CHECK (views_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_content_shape'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_content_shape
      CHECK (
        (
          content_type = 'image'
          AND file_path IS NOT NULL
          AND file_path ~ '^drops/[a-z0-9]+(-[a-z0-9]+){1,3}\.[a-z0-9]{2,5}$'
          AND text_content IS NULL
        )
        OR
        (
          content_type = 'text'
          AND file_path IS NULL
          AND text_content IS NOT NULL
          AND char_length(text_content) > 0
        )
      );
  END IF;
END $$;

-- 2. Private storage bucket. Viewer access is via Edge Function signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quick-drops', 'quick-drops', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_select_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_update_drops" ON public.drops;
DROP POLICY IF EXISTS "anon_delete_drops" ON public.drops;

-- No anonymous table policies on drops.
-- Creation uses create-drop, and viewing uses consume-drop.
-- Both Edge Functions use service-role credentials.

DROP POLICY IF EXISTS "anon_upload_quick_drops" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_quick_drops" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_quick_drops" ON storage.objects;

-- No anonymous storage policies. The Edge Functions use service role.

-- 4. Atomic drop consumption.
-- Returns zero rows for missing, expired, or already-consumed drops.
CREATE OR REPLACE FUNCTION public.consume_drop(p_drop_code TEXT)
RETURNS TABLE (
  id UUID,
  drop_code TEXT,
  file_path TEXT,
  content_type TEXT,
  text_content TEXT,
  caption TEXT,
  expires_at TIMESTAMPTZ,
  view_limit INTEGER,
  views_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  locked_drop public.drops%ROWTYPE;
BEGIN
  SELECT *
    INTO locked_drop
    FROM public.drops d
   WHERE d.drop_code = p_drop_code
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF locked_drop.expires_at <= now() THEN
    RETURN;
  END IF;

  IF locked_drop.view_limit IS NOT NULL
     AND locked_drop.views_count >= locked_drop.view_limit THEN
    RETURN;
  END IF;

  UPDATE public.drops d
     SET views_count = d.views_count + 1,
         consumed_at = CASE
           WHEN d.view_limit IS NOT NULL
            AND d.views_count + 1 >= d.view_limit
           THEN now()
           ELSE d.consumed_at
         END
   WHERE d.id = locked_drop.id
   RETURNING d.* INTO locked_drop;

  RETURN QUERY SELECT
    locked_drop.id,
    locked_drop.drop_code,
    locked_drop.file_path,
    locked_drop.content_type,
    locked_drop.text_content,
    locked_drop.caption,
    locked_drop.expires_at,
    locked_drop.view_limit,
    locked_drop.views_count,
    locked_drop.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_drop(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_drop(TEXT) TO service_role;

-- Used by the cleanup Edge Function.
CREATE OR REPLACE FUNCTION public.expired_drop_candidates(p_batch_size INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  content_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT d.id, d.file_path, d.content_type
    FROM public.drops d
   WHERE d.expires_at <= now()
      OR (
        d.view_limit IS NOT NULL
        AND d.views_count >= d.view_limit
        AND d.consumed_at <= now() - interval '2 minutes'
      )
   ORDER BY d.created_at ASC
   LIMIT greatest(1, least(coalesce(p_batch_size, 50), 500));
$$;

REVOKE ALL ON FUNCTION public.expired_drop_candidates(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expired_drop_candidates(INTEGER) TO service_role;

-- ============================================================
-- pg_cron setup (run separately after enabling pg_cron and pg_net)
-- ============================================================
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.schedule(
--   'cleanup-expired-drops',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-drops',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_ANON_KEY'
--     )
--   );
--   $$
-- );
