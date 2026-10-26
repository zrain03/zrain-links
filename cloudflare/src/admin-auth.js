/** Validate verified Firebase claims against the one configured server-side admin UID. */
export function adminIdentityMatches(payload, adminUid) {
  return !!adminUid && payload?.sub === adminUid && payload?.email === "zrain.dev@gmail.com" &&
    payload?.email_verified === true && payload?.firebase?.sign_in_provider === "google.com";
}
