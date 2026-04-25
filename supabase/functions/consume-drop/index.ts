// ============================================================
// Quick-Share Drops - Consume Drop Edge Function
// Atomically opens a drop by code and returns only that drop.
// ============================================================

import { json, optionsResponse } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase-admin.ts';

const supabaseAdmin = createSupabaseAdmin();

interface ConsumedDrop {
  id: string;
  drop_code: string;
  file_path: string | null;
  content_type: 'image' | 'text';
  text_content: string | null;
  caption: string | null;
  expires_at: string;
  view_limit: number | null;
  views_count: number;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  try {
    const dropCode = await getDropCode(req);
    if (!dropCode || !/^[a-z0-9]+(-[a-z0-9]+){1,3}$/.test(dropCode)) {
      return json({ error: 'Invalid drop code' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .rpc('consume_drop', { p_drop_code: dropCode });

    if (error) {
      console.error('consume_drop RPC failed:', error);
      return json({ error: 'Failed to open drop' }, 500);
    }

    const drop = (data?.[0] || null) as ConsumedDrop | null;
    if (!drop) {
      return json({ error: 'Drop not found or expired' }, 404);
    }

    let signedUrl: string | null = null;
    if (drop.content_type === 'image' && drop.file_path) {
      const expiresIn = Math.max(
        Math.floor((new Date(drop.expires_at).getTime() - Date.now()) / 1000),
        60
      );

      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from('quick-drops')
        .createSignedUrl(drop.file_path, Math.min(expiresIn, 86400));

      if (signedError || !signedData?.signedUrl) {
        console.error('Signed URL failed:', signedError);
        return json({ error: 'Could not load image' }, 500);
      }

      signedUrl = signedData.signedUrl;
    }

    return json({
      drop: {
        drop_code: drop.drop_code,
        content_type: drop.content_type,
        text_content: drop.content_type === 'text' ? drop.text_content : null,
        caption: drop.caption,
        expires_at: drop.expires_at,
        view_limit: drop.view_limit,
        views_count: drop.views_count,
        signed_url: signedUrl,
        file_name: drop.file_path?.split('/').pop() || null,
      },
    });
  } catch (err) {
    console.error('consume-drop function error:', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

async function getDropCode(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const queryCode = url.searchParams.get('code');
  if (queryCode) return queryCode.toLowerCase();

  const pathCode = url.pathname.split('/').filter(Boolean).pop();
  if (pathCode && pathCode !== 'consume-drop') return pathCode.toLowerCase();

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (typeof body?.code === 'string') return body.code.toLowerCase();
    } catch {
      return null;
    }
  }

  return null;
}
