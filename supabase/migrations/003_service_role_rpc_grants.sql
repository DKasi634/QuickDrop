-- ============================================================
-- Quick-Share Drops - Service role RPC grants
-- Edge Functions use SERVICE_ROLE_KEY and need explicit execute
-- privileges after public function access is revoked.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.consume_drop(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expired_drop_candidates(INTEGER) TO service_role;
