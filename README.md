# Quick Drop

Anonymous Quick-Share Drops for temporary image and text sharing.

## Workspace

- `quick-drop-extension` - WXT browser extension.
- `quick-drop-viewer` - Vite viewer page for shared links.
- `supabase` - SQL migration and Edge Functions.

## Environment

The extension and viewer both read env from the workspace root via their Vite config.

Required in `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_VIEWER_BASE_URL=http://localhost:5173
```

Use the deployed viewer origin for `VITE_VIEWER_BASE_URL` before packaging the extension.
For local development, keep it as `http://localhost:5173` while the viewer dev server is running.

Never put `SERVICE_ROLE_KEY` in `.env` if it is read by browser builds. Set it only as an Edge Function secret in Supabase.

## Supabase Setup

1. Run `supabase/migrations/001_create_drops.sql` in the Supabase SQL editor.
2. Log in and link the project, or pass `--project-ref` to every command:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. Deploy both Edge Functions:

```bash
npx supabase functions deploy consume-drop --use-api
npx supabase functions deploy cleanup-drops --use-api
```

4. Set Edge Function secrets:

```bash
npx supabase secrets set PROJECT_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
npx supabase secrets set SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

5. Enable `pg_cron` and `pg_net`, then install the cron block at the bottom of the migration with your project ref and anon key.

## Local Development

Extension:

```bash
cd quick-drop-extension
npm run dev
```

Viewer:

```bash
cd quick-drop-viewer
npm run dev
```

Type checks:

```bash
cd quick-drop-extension && npm run typecheck
cd quick-drop-viewer && npm run build
npm run check:functions
```

## Security Model

- Anonymous clients can insert constrained drop metadata and upload image objects into the private bucket.
- Anonymous clients cannot list, read, update, or delete drop rows.
- Anonymous clients cannot read or delete storage objects directly.
- The viewer calls `consume-drop`, which atomically opens a single drop by code and returns only that drop.
- One-view drops are consumed in a database transaction, so concurrent opens cannot both pass the view-limit check.
- Expired drops are removed by `cleanup-drops`; consumed one-view drops are blocked immediately and physically removed after a short grace window so the first viewer can finish loading image content.
