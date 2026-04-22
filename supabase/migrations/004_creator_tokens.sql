-- ============================================================
-- Quick-Share Drops - Creator tokens
-- Stores only a SHA-256 hash of the creator token. The raw token
-- is returned once by create-drop and kept in browser-local history.
-- ============================================================

ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS creator_token_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drops_creator_token_hash_shape'
  ) THEN
    ALTER TABLE public.drops
      ADD CONSTRAINT drops_creator_token_hash_shape
      CHECK (
        creator_token_hash IS NULL
        OR creator_token_hash ~ '^[a-f0-9]{64}$'
      );
  END IF;
END $$;
