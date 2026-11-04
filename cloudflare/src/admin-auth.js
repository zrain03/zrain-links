/**
 * Fail / File: cloudflare/src/admin-auth.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Pengesahan identiti administrator.
 * EN: Administrator identity validation.
 */

/** Validate verified Firebase claims against the one configured server-side admin UID. */
export function adminIdentityMatches(payload, adminUid) {
  return !!adminUid && payload?.sub === adminUid && payload?.email === "zrain.dev@gmail.com" &&
    payload?.email_verified === true && payload?.firebase?.sign_in_provider === "google.com";
}
