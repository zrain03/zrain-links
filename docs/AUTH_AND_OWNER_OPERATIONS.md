# Zrain Links — authentication and owner operations

## Google Sign-In
The frontend now provides **Continue with Google** via Firebase Authentication `GoogleAuthProvider` and `signInWithPopup`. The existing Cloudflare Worker already verifies Firebase ID tokens using Google's JWKS and checks issuer, audience, RS256 signature and verified email.

**Operator configuration still required:**
1. Open Firebase Console for project `zrain-links`, navigate to **Authentication → Sign-in method**, and enable **Google**. Supply the required project support email.
2. Confirm `zrain-links.web.app` is an authorized Authentication domain.
3. Test with a newly created Google account and separately with a pre-existing email/password account. An account collision must never silently assign one user's D1 link collection to another Firebase UID. The UI shows a safe explanation for an account-exists-with-different-credential error; linking existing providers is **not implemented**.
4. Do not enable public rollout until sign-in, sign-out, returning sessions and existing link ownership have been tested on the deployed website.

## Password recovery
The frontend now calls Firebase `sendPasswordResetEmail` after the user enters an email address; do not build a custom reset token or email listing endpoint. A generic successful message avoids exposing registered email addresses. Check Firebase email-template settings and sender configuration. Test the email link on an existing account and on mobile. No password is sent to the Zrain Links Worker by this recovery path.

## Malaysia creation timestamps
The D1 database already stores `created_at` in UTC epoch seconds. The API converts it to ISO UTC and the frontend displays it in `Asia/Kuala_Lumpur` using Intl. **No schema/storage change.**

## Owner visibility — privacy-first approach
The owner can inspect aggregate D1 data without duplicating it into Firestore. Current records in `short_links` already contain `owner_id`, `code`, `destination_url`, `created_at` and `click_count`.

Safe read-only operational queries for the authenticated operator using Wrangler D1 remote access:
```sql
SELECT COUNT(*) AS total_links, SUM(click_count) AS total_visits FROM short_links;
SELECT code, destination_url, datetime(created_at, 'unixepoch') AS created_utc,
       click_count FROM short_links ORDER BY created_at DESC LIMIT 50;
```
Only execute with the authorized Cloudflare account and don't publish user emails or private analytics. Avoid an admin HTTP route without server-verified admin identity (e.g. a fixed allowlist of privileged Firebase UIDs) and strict read-only controls. A browser-side 'admin=true' flag is not protection.

## Additional recommended launch work
- Preserve existing Firebase user IDs; add a deliberate, tested provider-account linking flow later if needed.
- Implement abuse reporting and moderation for malicious redirect destinations.
- Establish tested D1 data recovery/backups and reliable monitoring before promising long-term links.
- Audit link creation, deletion, sign-in state and mobile accessibility before production updates.

**Code changes in branch `feature/links-foundation` are not the same as deployment.** Firebase provider enablement, CI pass and live end-to-end tests must be separately confirmed.
