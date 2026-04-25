-- ============================================================
-- Quick-Share Drops - Lightweight rate limits
-- Stores hashed request fingerprints for short-lived abuse limits.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  rate_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at
  ON public.rate_limits(expires_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "anon_insert_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "anon_update_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "anon_delete_rate_limits" ON public.rate_limits;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_rate_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_rate_key IS NULL
     OR char_length(p_rate_key) < 8
     OR p_limit < 1
     OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  DELETE FROM public.rate_limits
   WHERE expires_at <= now();

  INSERT INTO public.rate_limits (rate_key, count, expires_at)
  VALUES (
    p_rate_key,
    1,
    now() + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (rate_key) DO UPDATE
     SET count = public.rate_limits.count + 1
   WHERE public.rate_limits.expires_at > now()
  RETURNING count INTO current_count;

  IF current_count IS NULL THEN
    UPDATE public.rate_limits
       SET count = 1,
           expires_at = now() + make_interval(secs => p_window_seconds)
     WHERE rate_key = p_rate_key
     RETURNING count INTO current_count;
  END IF;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
