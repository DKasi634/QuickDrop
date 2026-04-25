import { createClient } from 'jsr:@supabase/supabase-js@2';

export function createSupabaseAdmin() {
  return createClient(
    Deno.env.get('PROJECT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
