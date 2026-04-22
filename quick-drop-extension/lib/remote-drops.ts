import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

interface DeleteDropResponse {
  deleted?: boolean;
  alreadyGone?: boolean;
  error?: string;
}

export async function deleteRemoteDrop(
  dropCode: string,
  creatorToken: string
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-drop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ dropCode, creatorToken }),
  });

  const body = (await response.json().catch(() => ({}))) as DeleteDropResponse;

  if (!response.ok || !body.deleted) {
    throw new Error(body.error || `Delete failed (${response.status})`);
  }
}
