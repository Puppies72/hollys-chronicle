# Holly's Chronicle v1.8 — installable PWA + cloud sync

This is a **working source package**, not a deployed website. Cloud sync requires a Supabase project and HTTPS hosting; it will not work by opening `index.html` directly from disk.

## One-time setup

1. Create a Supabase project at https://supabase.com . In its **SQL Editor**, run `supabase-setup.sql`.
2. Under **Authentication → Providers**, enable Email. For straightforward setup, you may require email confirmation (recommended). Set your site URL to the address where you host this PWA.
3. Under **Project Settings → API** (or the current Supabase UI equivalent), copy the **project URL** and the **publishable key / anon key**. **Never use a service_role or secret key.**
4. Publish the contents of this folder as a static website using GitHub Pages, Cloudflare Pages or Netlify. HTTPS is required for installation and service workers. For GitHub Pages, create a repository, upload these files to its root, then enable Pages from the main branch root.
5. Open the published URL on your laptop. Expand **Cloud sync** at the lower right. Enter the project URL/key, create an account and confirm email if required; then sign in.
6. On the **first device**, use **Upload local copy** if your existing campaign is present, or **Sync now** if this is a fresh app. If migrating from the old `file://` HTML, first export its JSON via **Data & backup**, then import that JSON in the hosted app before uploading.
7. On your **second device**, sign in with the same account, choose **Download cloud copy**, and the campaign will load. Thereafter edits sync automatically when online.
8. Laptop: use Edge or Chrome's **Install app** menu. Android phone: Chrome → menu → **Add to Home screen** / **Install app**.

## How syncing works

- Local changes save immediately to browser storage. The app attempts cloud upload shortly after each edit, and checks the cloud roughly every 30 seconds while active.
- If both devices edit from the same cloud revision before receiving each other's updates, the app **pauses on a conflict**. Export a JSON backup, then explicitly select which version to keep. It does not silently merge conflicting edits.
- If offline, edits remain in local browser storage and are uploaded after reconnecting. **Do not clear browser storage** before syncing or exporting a backup.
- Data remains private under Supabase Row Level Security. The Supabase URL and publishable key are public identifiers; account passwords and tokens must be kept private.
- Updating app code requires deploying replacement files to the **same hosting address**, not downloading a new HTML file on each device.
- There is no direct automatic integration with the ChatGPT RPG conversation yet; that needs a separate authorised integration.

## Important limitations

- Browser storage is not a substitute for backups: export JSON regularly.
- Cloud sync is per user account, not an invitation/collaboration system.
- The current version retains embedded artwork, making the HTML ~9 MB; this can be optimised later.
- If you sign in to a different account, choose your initial upload/download direction carefully.
- `supabase-setup.sql` should be run once per project; rerunning it after policies already exist may produce a policy-exists error.
