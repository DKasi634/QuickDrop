import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const VIEWER_BASE_URL =
  import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:5173';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _client;
}

export async function createSignedUrl(
  filePath: string,
  expiresInSeconds: number
): Promise<string | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from('quick-drops')
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}
