# Zrain Links - Visits Links (action-based unlock)

The same Zrain Links website now contains **two independent link types**:

- **Direct Links:** unchanged direct redirect, QR, copy and visit counters.
- **Visits Links:** separate D1 tables, owner APIs and visitor unlock pages. Creator supplies a destination URL, a title, and between 1 and 20 ordered actions. The public short name is **read-only and generated from a title prefix plus a random four-letter suffix**, e.g. `claim-mp-MsAg`. If it collides with an existing Direct or Visits Link, the backend generates a different suffix. The optional **Shorten link automatically** checkbox instead creates a fully random short name without the title prefix.

The **Visit a page** action is prominently available through its own Add button and the first option in the action picker, but **no particular action type is mandatory**. Users can select any supported platform action and provide an official HTTPS URL.
The picker now offers **Visit a page and social media only** (YouTube, Instagram, TikTok, Facebook, X, Reddit, LinkedIn, Pinterest, Snapchat, Threads). Music, gaming, developer, app-store and messaging choices are no longer offered for *new* Visits Links. Existing previously published actions retain their original labels and remain usable.
The public URL appears in **Live Unlock Preview**, not as an editable builder field. The backend retries a new random suffix if a title-based name is taken. The preview shows an `XXXX` placeholder until the final name is generated at publish time.

## How visitors use a Visits Link

1. Open the public URL, e.g. `https://zrain-links.web.app/my-campaign-MsAg`. Firebase Hosting redirects it to the Cloudflare Worker, which redirects a Visits Link to `/visit.html?code=my-campaign-MsAg`. Ordinary Direct Links continue to redirect immediately.
2. The public unlock page displays the link title, action list, page-view count and unlock count. The final destination is **not sent by the details API before unlock**.
3. Each action offers a clickable external URL with `target="_blank"` and `rel="noopener noreferrer"`. After opening an action, the visitor may mark it complete.
4. Once all actions are acknowledged, the visitor can choose **Unlock link**. The Worker validates that all action positions are present, increments the unlock counter, and returns the final HTTPS destination.

**Important security/measurement boundary:** External follows, subscriptions, comments, installations, likes and website visits are **not automatically verified** by third-party APIs. Completion uses visitor acknowledgement; a technically capable visitor can forge these acknowledgements. The page says this plainly. Views measure link-page loads (including refreshes/bots), **not unique people**. Do not describe this as verified engagement or unique visits.

### Creator capabilities

- Action picker: searchable, categorized platform/action catalog; 1–20 actions; action URLs are validated against each platform's expected domain.
- Actions can be moved up/down or removed.
- Separate link creation and My Visits Links lists; owner-only deletion/QR, views and unlock counts in Malaysia time with seconds.
- Shared Firebase Authentication from the existing Direct Links login. User profiles are not replicated and projects/backends remain independent.
- Shared short-name registry prevents a direct and visits link from simultaneously owning the same code; database triggers release a name on deletion.

### Admin

The existing UID-pinned Admin Dashboard manages both types from the All links list, identifies each type, includes Visits Link views in aggregate statistics, and deletes both types when a Firebase user is permanently deleted or a deleted account's D1 records are purged. Existing admin security and audit controls remain in force.

## Updating an already migrated production instance (27 Oct 2026)

If migration `0003_visits_links.sql` was already applied successfully, **do not reapply any database migration or reset D1** for this title/shortening/catalog refinement. It changes only the Worker and frontend.

```powershell
cd C:\Users\kul_mu.nazri\Downloads\zrain-links
git status --short
git pull --ff-only origin feature/links-foundation
cd cloudflare
npm test
npx wrangler deploy
cd ..
firebase deploy --only hosting --project zrain-links
```

Stop if `git pull` or `npm test` fails. Keep prior Git stash untouched; don't automatically pop it over the updated UI.

## Deploy safely (PowerShell)

**Back up remote D1 before applying the migration.** This can temporarily pause database queries and asks for confirmation. Choose a convenient time; the previous backup you cancelled did not create a new backup.

```powershell
cd C:\Users\kul_mu.nazri\Downloads\zrain-links
git status --short
git pull --ff-only origin feature/links-foundation

cd cloudflare
npm install
npm test
npx wrangler d1 export zrain-links-db --remote --output "$env:USERPROFILE\Downloads\zrain-links-pre-visits.sql"
Test-Path "$env:USERPROFILE\Downloads\zrain-links-pre-visits.sql"
```

Verify export succeeded and `Test-Path` is `True`. **Only then** run:

```powershell
npx wrangler d1 migrations apply zrain-links-db --remote
npx wrangler deploy
cd ..
firebase deploy --only hosting --project zrain-links
```

**Order matters**: the migration adds `visits_links`, `visits_actions` and `link_names` which the updated Worker expects, including for Direct Link name checking. Deploying the new Worker before migration would break routes. Do not reset the database.

The new shared public pages are `/visit.html`, `/visits-ui.js`, `/visit-page.js` and `/visits.css`. Both Cloudflare Worker assets and Firebase Hosting require a deploy. No new secrets needed beyond the existing Firebase Authentication/Admin configuration.

## End-to-end manual checklist after test + deploy

- Direct Link create / rename unavailable / copy / QR / redirect / delete and visit count all still work.
- Visits Link form refuses missing destination/title/actions and invalid/mismatched social-platform URLs.
- Visit a page can be added directly **or omitted** in favor of other actions.
- Action picker search, categories, reordering and remove work.
- Name collisions across Direct/Visits return a clear error; deleting a link frees its alias.
- The public Visits Link opens a distinct unlock page, does **not** immediately redirect, and shows all actions.
- Buttons to acknowledge actions start disabled until the visitor opens each action. Unlock stays disabled until all marked.
- Unlock redirects to destination only after visitor acknowledges actions; counts update when refreshed.
- My Visits Links shows the owner's entries separately and supports copy, QR and delete.
- Admin can list/delete a throwaway Direct Link and throwaway Visits Link, and orphan/user cleanup removes both.
- Signed-out users must sign in before creating or managing either type.
- Test a narrow mobile viewport and a desktop browser; test with fresh user data before publishing broadly.

For this frontend and routing update, do not re-run the already-applied D1 migration. Run automated tests and deploy both Worker and Firebase Hosting.
