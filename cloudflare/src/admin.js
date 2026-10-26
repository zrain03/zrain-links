import { adminIdentityMatches } from "./admin-auth.js";
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from "jose";

const PROJECT = "zrain-links";
const ADMIN_EMAIL = "zrain.dev@gmail.com";
const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const identityBase = "https://identitytoolkit.googleapis.com/v1/projects/" + PROJECT + "/accounts:";
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
});

function fail(status, message) { return json({ message }, status); }
function validId(value) { return typeof value === "string" && value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value); }
async function readConfirmation(request) {
  const body = await request.text();
  if (body.length > 2048) throw new Error("Confirmation body too large.");
  try { const parsed = JSON.parse(body); return typeof parsed?.confirm === "string" ? parsed.confirm : ""; }
  catch { return ""; }
}
async function tokenForFirebase(env) {
  if (!env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) throw new Error("Firebase account management is not configured.");
  let creds;
  try { creds = JSON.parse(env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON); }
  catch { throw new Error("Firebase service account configuration is invalid."); }
  if (creds.project_id !== PROJECT || !creds.client_email || !creds.private_key) {
    throw new Error("Firebase service account project does not match Zrain Links.");
  }
  const key = await importPKCS8(creds.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/identitytoolkit" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(creds.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Firebase service account authorization failed.");
  return data.access_token;
}
async function firebaseCall(accessToken, action, options = {}) {
  const response = await fetch(identityBase + action + (options.query || ""), {
    method: options.method || "GET",
    headers: { Authorization: "Bearer " + accessToken, ...(options.body ? { "content-type": "application/json" } : {}) },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Firebase administration request failed (" + response.status + "). Check the service account's IAM permissions.");
  return data;
}
async function getAdmin(request, env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return { failure: fail(401, "Sign in with Google to continue.") };
  try {
    const verified = await jwtVerify(authorization.slice(7), firebaseKeys, {
      issuer: "https://securetoken.google.com/" + PROJECT, audience: PROJECT, algorithms: ["RS256"]
    });
    if (!adminIdentityMatches(verified.payload, env.ZRAIN_ADMIN_FIREBASE_UID)) {
      return { failure: fail(403, "This account is not authorized to manage Zrain Links.") };
    }
    return { payload: verified.payload };
  } catch {
    return { failure: fail(401, "Your session is invalid. Sign in again.") };
  }
}
function recentAuth(payload) {
  return typeof payload.auth_time === "number" && Math.floor(Date.now() / 1000) - payload.auth_time <= 900;
}
function dateIso(seconds) { return new Date(Number(seconds) * 1000).toISOString(); }
export async function handleAdmin(request, env, db) {
  const authorized = await getAdmin(request, env);
  if (authorized.failure) return authorized.failure;
  const path = new URL(request.url).pathname, method = request.method;
  const admin = authorized.payload;

  if (method === "GET" && path === "/api/v1/admin/me") {
    return json({ admin: true, firebaseManagementConfigured: !!env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON });
  }
  if (method === "GET" && path === "/api/v1/admin/overview") {
    const [links, users] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS total_links, COALESCE(SUM(click_count),0) AS total_visits FROM short_links").first(),
      db.prepare("SELECT COUNT(*) AS known_users FROM users").first()
    ]);
    return json({ totalLinks: links.total_links, totalVisits: links.total_visits, knownUsers: users.known_users });
  }
  if (method === "GET" && path === "/api/v1/admin/links") {
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim().slice(0, 100);
    const offset = Math.max(0, Math.min(100000, Number.parseInt(params.get("offset") || "0", 10) || 0));
    const like = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
    const where = q ? " WHERE code LIKE ? ESCAPE '\\' OR destination_url LIKE ? ESCAPE '\\' OR owner_id LIKE ? ESCAPE '\\'" : "";
    const bindings = q ? [like, like, like] : [];
    const total = await db.prepare("SELECT COUNT(*) AS n FROM short_links" + where).bind(...bindings).first();
    const page = await db.prepare("SELECT id, code, owner_id, destination_url, click_count, created_at FROM short_links" + where +
      " ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?").bind(...bindings, offset).all();
    return json({ total: total.n, offset, links: (page.results || []).map(row => ({
      id: row.id, code: row.code, ownerId: row.owner_id, destinationUrl: row.destination_url,
      clickCount: row.click_count, createdAt: dateIso(row.created_at)
    })) });
  }
  const linkDelete = path.match(/^\/api\/v1\/admin\/links\/([0-9a-f-]{36})$/);
  if (method === "DELETE" && linkDelete) {
    if (!recentAuth(admin)) return fail(403, "Sign out and sign in with Google again before deleting.");
    const record = await db.prepare("SELECT id, code FROM short_links WHERE id = ?").bind(linkDelete[1]).first();
    if (!record) return fail(404, "Link already deleted.");
    if (await readConfirmation(request) !== record.code) return fail(400, "Type the exact link name to confirm deletion.");
    const results = await db.batch([
      db.prepare("DELETE FROM short_links WHERE id = ?").bind(record.id),
      db.prepare("INSERT INTO admin_events (id,admin_uid,action,target,created_at) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(), admin.sub, "DELETE_LINK", record.code, Math.floor(Date.now() / 1000))
    ]);
    return results[0]?.meta?.changes ? json({ deleted: true, code: record.code }) : fail(409, "Link changed. Refresh and try again.");
  }
  if (method === "GET" && path === "/api/v1/admin/users") {
    if (!env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) return fail(503, "Firebase account management is not configured.");
    const params = new URL(request.url).searchParams;
    const pageToken = params.get("pageToken") || "";
    if (pageToken.length > 2048) return fail(400, "Invalid page token.");
    const access = await tokenForFirebase(env);
    const data = await firebaseCall(access, "batchGet", { query: "?maxResults=100" + (pageToken ? "&nextPageToken=" + encodeURIComponent(pageToken) : "") });
    const rawUsers = data.users || [];
    const ownerIds = rawUsers.map(u => "firebase:" + u.localId);
    let counts = new Map();
    if (ownerIds.length) {
      const rows = await db.prepare("SELECT owner_id, COUNT(*) AS total_links FROM short_links WHERE owner_id IN (" +
        ownerIds.map(() => "?").join(",") + ") GROUP BY owner_id").bind(...ownerIds).all();
      counts = new Map((rows.results || []).map(row => [row.owner_id, row.total_links]));
    }
    return json({ nextPageToken: data.nextPageToken || null, users: rawUsers.map(u => ({
      uid: u.localId, email: u.email || "", displayName: u.displayName || "",
      verified: !!u.emailVerified, disabled: !!u.disabled, isAdmin: u.localId === env.ZRAIN_ADMIN_FIREBASE_UID,
      createdAt: u.createdAt ? new Date(Number(u.createdAt)).toISOString() : null,
      lastLoginAt: u.lastLoginAt ? new Date(Number(u.lastLoginAt)).toISOString() : null,
      linkCount: counts.get("firebase:" + u.localId) || 0
    })) });
  }
  if (method === "GET" && path === "/api/v1/admin/d1-accounts") {
    const rows = await db.prepare(
      "SELECT u.id, u.created_at, COUNT(l.id) AS link_count FROM users u LEFT JOIN short_links l ON l.owner_id = u.id WHERE u.id LIKE 'firebase:%' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200"
    ).all();
    return json({ accounts: (rows.results || []).map(row => ({
      uid: row.id.slice("firebase:".length), createdAt: dateIso(row.created_at), linkCount: row.link_count
    })) });
  }
  const orphanDelete = path.match(/^\/api\/v1\/admin\/d1-accounts\/([^/]+)$/);
  if (method === "DELETE" && orphanDelete) {
    if (!recentAuth(admin)) return fail(403, "Sign out and sign in with Google again before deleting.");
    const uid = decodeURIComponent(orphanDelete[1]);
    if (!validId(uid)) return fail(400, "Invalid user ID.");
    if (uid === env.ZRAIN_ADMIN_FIREBASE_UID) return fail(403, "Admin account is protected.");
    if (!env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) return fail(503, "Firebase account verification is not configured.");
    if (await readConfirmation(request) !== uid) return fail(400, "Type the exact UID to confirm.");
    const access = await tokenForFirebase(env);
    const info = await firebaseCall(access, "lookup", { method: "POST", body: { localId: [uid] } });
    if ((info.users || []).some(u => u.localId === uid)) {
      return fail(409, "This Firebase user still exists. Delete it from the Firebase users tab instead.");
    }
    const ownerId = "firebase:" + uid;
    const existing = await db.prepare("SELECT id FROM users WHERE id = ?").bind(ownerId).first();
    if (!existing) return fail(404, "D1 account record no longer exists.");
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO deleted_firebase_uids (uid, deleted_at) VALUES (?,?)").bind(uid, Math.floor(Date.now() / 1000)),
      db.prepare("DELETE FROM short_links WHERE owner_id = ?").bind(ownerId),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(ownerId),
      db.prepare("DELETE FROM users WHERE id = ?").bind(ownerId),
      db.prepare("INSERT INTO admin_events (id,admin_uid,action,target,created_at) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(), admin.sub, "PURGE_ORPHAN", uid, Math.floor(Date.now() / 1000))
    ]);
    return json({ deleted: true });
  }
  const userDelete = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
  if (method === "DELETE" && userDelete) {
    if (!recentAuth(admin)) return fail(403, "Sign out and sign in with Google again before deleting.");
    const uid = decodeURIComponent(userDelete[1]);
    if (!validId(uid)) return fail(400, "Invalid Firebase UID.");
    if (uid === env.ZRAIN_ADMIN_FIREBASE_UID) return fail(403, "The only admin account cannot be deleted.");
    if (!env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) return fail(503, "Firebase account management is not configured.");
    const access = await tokenForFirebase(env);
    const info = await firebaseCall(access, "lookup", { method: "POST", body: { localId: [uid] } });
    const target = (info.users || []).find(u => u.localId === uid);
    if (!target) return fail(404, "Firebase user not found. Any orphaned links can still be deleted individually.");
    if ((target.email || "").toLowerCase() === ADMIN_EMAIL) return fail(403, "The admin email cannot be deleted.");
    if (await readConfirmation(request) !== target.email) return fail(400, "Type the exact account email to confirm deletion.");
    const stamp = Math.floor(Date.now() / 1000);
    await db.prepare("INSERT OR IGNORE INTO deleted_firebase_uids (uid,deleted_at) VALUES (?,?)").bind(uid, stamp).run();
    try {
      await firebaseCall(access, "delete", { method: "POST", body: { localId: uid } });
    } catch (error) {
      await db.prepare("DELETE FROM deleted_firebase_uids WHERE uid = ?").bind(uid).run();
      throw error;
    }
    const ownerId = "firebase:" + uid;
    await db.batch([
      db.prepare("DELETE FROM short_links WHERE owner_id = ?").bind(ownerId),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(ownerId),
      db.prepare("DELETE FROM users WHERE id = ?").bind(ownerId),
      db.prepare("INSERT INTO admin_events (id,admin_uid,action,target,created_at) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(), admin.sub, "DELETE_USER", uid, stamp)
    ]);
    return json({ deleted: true });
  }
  return fail(404, "Admin endpoint not found.");
}
