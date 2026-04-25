import { sha256Hex } from './crypto.ts';

interface RateLimitClient {
  rpc: (fn: string, args: Record<string, unknown>) => unknown;
}

export async function getRateLimitKey(
  req: Request,
  scope: string
): Promise<string> {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const fingerprint =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('fly-client-ip') ||
    forwardedFor ||
    req.headers.get('x-real-ip') ||
    req.headers.get('user-agent') ||
    'unknown';

  return `${scope}:${await sha256Hex(fingerprint)}`;
}

export async function checkRateLimit(
  supabaseAdmin: RateLimitClient,
  rateKey: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_rate_key: rateKey,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  }) as { data: boolean | null; error: unknown };

  if (error) {
    console.error('Rate limit check failed:', error);
    return true;
  }

  return data === true;
}
