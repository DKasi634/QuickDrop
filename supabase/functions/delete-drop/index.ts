// ============================================================
// Quick-Share Drops - Delete Drop Edge Function
// Allows a creator to delete their own drop using the one-time
// creator token stored only in browser-local history.
// ============================================================

import { constantTimeEqual, sha256Hex } from '../_shared/crypto.ts';
import { json, optionsResponse } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase-admin.ts';

const supabaseAdmin = createSupabaseAdmin();

interface DeleteRequest {
  dropCode?: string;
  creatorToken?: string;
}

interface DropRow {
  id: string;
  file_path: string | null;
  creator_token_hash: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse('POST, OPTIONS');
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as DeleteRequest;
    const dropCode = body.dropCode?.toLowerCase().trim();
    const creatorToken = body.creatorToken?.trim();

    if (!dropCode || !/^[a-z0-9]+(-[a-z0-9]+){1,3}$/.test(dropCode)) {
      return json({ error: 'Invalid drop code' }, 400);
    }

    if (!creatorToken || creatorToken.length < 32 || creatorToken.length > 128) {
      return json({ error: 'Invalid creator token' }, 400);
    }

    const creatorTokenHash = await sha256Hex(creatorToken);
    const { data: drop, error: selectError } = await supabaseAdmin
      .from('drops')
      .select('id, file_path, creator_token_hash')
      .eq('drop_code', dropCode)
      .maybeSingle();

    if (selectError) {
      console.error('Drop lookup failed:', selectError);
      return json({ error: 'Failed to delete drop' }, 500);
    }

    const dropRow = drop as DropRow | null;
    if (!dropRow) {
      return json({ deleted: true, alreadyGone: true });
    }

    if (
      !dropRow.creator_token_hash ||
      !constantTimeEqual(dropRow.creator_token_hash, creatorTokenHash)
    ) {
      return json({ error: 'Not allowed to delete this drop' }, 403);
    }

    if (dropRow.file_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('quick-drops')
        .remove([dropRow.file_path]);

      if (storageError) {
        console.error('Storage delete failed:', storageError);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('drops')
      .delete()
      .eq('id', dropRow.id);

    if (deleteError) {
      console.error('Drop row delete failed:', deleteError);
      return json({ error: 'Failed to delete drop' }, 500);
    }

    return json({ deleted: true });
  } catch (err) {
    console.error('delete-drop function error:', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
