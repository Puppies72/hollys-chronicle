# Holly's Chronicle v1.9 — existing Supabase integration

## Deploy
Upload all files from this folder to the **root** of the existing `hollys-chronicle` GitHub repository (replace existing files with matching names). Do NOT run the v1.8 `supabase-setup.sql` file; v1.9 uses the existing `chronicle_campaigns` and `chronicle_snapshots` tables.

After GitHub Pages refreshes, open the app and expand **Cloud sync — existing campaign**. Enter your existing Supabase project URL and **publishable/anon** key (not service_role), then sign in using your existing Supabase Auth account.

**Before synchronizing:** In Data & backup, export your current local Chronicle JSON. Supabase already has three older snapshots, which may contain test/legacy data. On your laptop, choose **Start from this device** to append a new snapshot without changing old ones. On your phone, sign in and choose **Download latest**. Only use Download latest if it reports a valid Chronicle state.

Normal edits on either device append new snapshots after a short delay. The other device detects newer versions; choose Download latest to apply them. This is safe, *not fully automatic cross-device application* yet. Two-device simultaneous editing requires manual conflict resolution. Existing `chronicle_session_updates` are left untouched.

This app uses Supabase's authenticated REST API and depends on the existing RLS policies granting the owner read access to campaigns/snapshots and insert access to snapshots. If permission errors occur, inspect policies before changing them. Never publish passwords or secret keys.

## Known limitations
- Existing Supabase snapshots have not been inspected for schema compatibility beyond screenshots.
- Concurrent snapshot inserts are not fully transactional without a server-side version-claim RPC or database unique constraint. Never edit simultaneously on two devices.
- The Overview current-scene text is a static latest-scene label, not yet automatically derived from journal state.
- The app is not connected directly to ChatGPT sessions.
