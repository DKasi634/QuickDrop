// ============================================================
// Quick-Share Drops — Cleanup Edge Function
// Deletes expired drops from both Storage and the database.
// Triggered by pg_cron every 15 minutes.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('PROJECT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const BATCH_SIZE = 50;

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date().toISOString();

    const { data: allExpired, error: expiredError } = await supabaseAdmin
      .rpc('expired_drop_candidates', { p_batch_size: BATCH_SIZE });

    if (expiredError) {
      console.error('Error fetching expired drops:', expiredError);
      return new Response(JSON.stringify({ error: expiredError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!allExpired || allExpired.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'No expired drops found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let deletedCount = 0;

    for (const drop of allExpired) {
      // Delete file from Storage if it exists
      if (drop.file_path && drop.content_type === 'image') {
        const { error: storageError } = await supabaseAdmin.storage
          .from('quick-drops')
          .remove([drop.file_path]);

        if (storageError) {
          console.error(`Failed to delete storage file ${drop.file_path}:`, storageError);
          // Continue anyway — delete the row so it doesn't keep retrying
        }
      }

      // Delete the database row
      const { error: deleteError } = await supabaseAdmin
        .from('drops')
        .delete()
        .eq('id', drop.id);

      if (deleteError) {
        console.error(`Failed to delete drop row ${drop.id}:`, deleteError);
      } else {
        deletedCount++;
      }
    }

    console.log(`Cleanup complete: deleted ${deletedCount} of ${allExpired.length} expired drops`);

    return new Response(
      JSON.stringify({
        deleted: deletedCount,
        total_found: allExpired.length,
        timestamp: now,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Cleanup function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
