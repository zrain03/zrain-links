# Zrain Links Admin Dashboard

The admin dashboard is available at https://zrain-links.web.app/admin.html. The admin UID is intentionally not stored in GitHub, frontend source or documentation. Only server-side secret ZRAIN_ADMIN_FIREBASE_UID, a verified matching Firebase email and Google sign-in are trusted.

## Features
- Platform totals, all D1 short links, owner ID, destination, clicks, creation date/time (including MYT seconds).
- Search and pagination; delete a link with exact typed confirmation.
- Firebase accounts with display name, email, UID, creation/last-login times and link counts; permanently delete user plus owned links.
- D1 records of Firebase identities, including orphaned records; only purge if Firebase lookup confirms the user no longer exists.
- Prevent self-deletion of the designated admin; mutations require a sign-in from within the last 15 minutes.
- Database audit table admin_events and deleted_firebase_uids tombstones prevent deleted users from using an unexpired Firebase token.

## Deployment (PowerShell)

Run from the repository root and ensure no conflicting local source changes.

    git pull --ff-only origin feature/links-foundation
    cd cloudflare
    npm install
    npm test

Export a private D1 backup:

    npx wrangler d1 export zrain-links-db --remote --output "$env:USERPROFILE\Downloads\zrain-links-pre-admin.sql"

Apply the database migration BEFORE deploying the new Worker code:

    npx wrangler d1 migrations apply zrain-links-db --remote

Configure the sole authorized admin UID as a Cloudflare secret; paste the value only when prompted. Never commit it to GitHub or send it to a chat:

    npx wrangler secret put ZRAIN_ADMIN_FIREBASE_UID

For listing and deleting Firebase Authentication users, create a suitable Firebase service account for project zrain-links with firebaseauth.users.get and firebaseauth.users.delete permissions. Use a least-privileged role that grants these operations. Firebase Console → Project settings → Service accounts → Generate new private key produces a JSON key. Store the key in a private location and upload it to Wrangler as a secret using PowerShell, replacing this placeholder file path with the real local file:

    Get-Content -LiteralPath "C:\secure\path\firebase-service-account.json" -Raw | npx wrangler secret put FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON

Do NOT run the example placeholder path unchanged. If Get-Content cannot find that file, PowerShell may still run Wrangler and store an EMPTY value: a Wrangler "Success!" response does not prove the JSON was valid.

Safer PowerShell upload with checks:

    $keyFile = Read-Host "Enter the full path to the downloaded Firebase service-account JSON"
    if (-not (Test-Path -LiteralPath $keyFile -PathType Leaf)) { throw "Service account JSON file does not exist. Secret not uploaded." }
    $json = Get-Content -LiteralPath $keyFile -Raw -ErrorAction Stop
    $account = $json | ConvertFrom-Json -ErrorAction Stop
    if ($account.type -ne "service_account" -or $account.project_id -ne "zrain-links" -or [string]::IsNullOrWhiteSpace($account.private_key)) { throw "Not a valid Zrain Links Firebase service-account file." }
    $json | npx wrangler secret put FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON

This key is highly sensitive. Do not commit it, upload it to public/ or paste it into chat. Revoke/rotate it if exposed. If this secret is invalid, D1 link operations and stats work but Firebase account listing/deletion and orphan cleanup fail closed.

When a delete action says recent Google verification is required, use the new "Verify with Google" button on the dashboard; sign out and sign back in as a fallback. The Worker requires confirmation within the last 15 minutes.

Deploy the Worker and then Firebase Hosting:

    npx wrangler deploy
    cd ..
    firebase deploy --only hosting --project zrain-links

Sign in with the authorized Google account and click Admin in the main website menu.

## Verification and limits

- The API verifies the signed Firebase ID token, issuer, audience, signature, provider and configured UID. Access to the static admin.html alone does not grant access to data.
- Test admin access from the correct Google account and denial from another Firebase user; check 403 without disclosing secrets.
- Test list links, search, delete a throwaway link, and verify alias becomes available.
- Test user deletion only using a throwaway Firebase user, not the admin. Confirm its D1 links disappear.
- Test orphan cleanup by deleting a throwaway Firebase account in Firebase Console then using D1 records.
- Admin removal of Firebase user and D1 data is not one cross-platform transaction. If Firebase deletion succeeds but D1 cleanup fails, the tombstone remains and the orphan can be cleaned later.
- Unit/static tests cannot prove a live Cloudflare deployment, correct Firebase IAM, or end-to-end account deletion. Verify those separately before public rollout.
- The Admin dashboard cannot execute arbitrary SQL or impersonate other users.
