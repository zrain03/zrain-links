import { getOrigin, randomAlias, validateAlias, validateDestination } from "./core.js";
import { renderSVG } from "uqr";
import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_PROJECT = "zrain-links";
const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const allowedOrigins = new Set(["https://zrain-links.web.app", "https://zrain-links.firebaseapp.com", "https://zrain-links.zrain-dev.workers.dev"]);
function corsHeaders(request) { const origin=request.headers.get("origin"); return origin && allowedOrigins.has(origin) ? {"access-control-allow-origin":origin,"vary":"Origin","access-control-allow-headers":"Authorization, Content-Type","access-control-allow-methods":"GET, POST, DELETE, OPTIONS"} : {}; }


function withCors(response, cors) { const headers = new Headers(response.headers); for (const [key,value] of Object.entries(cors)) headers.set(key,value); return new Response(response.body,{status:response.status,headers}); }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers } });
const error = (code, message, status) => json({ status, code, message }, status);
const now = () => Math.floor(Date.now() / 1000);
const id = () => crypto.randomUUID();
const token = () => { const arr = crypto.getRandomValues(new Uint8Array(32)); return Array.from(arr, b => b.toString(16).padStart(2, "0")).join(""); };
async function hash(text) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, "0")).join(""); }
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 210000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), x => x.toString(16).padStart(2, "0")).join("");
}
async function readBody(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw { status: 415, message: "Send JSON data." };
  if (Number(request.headers.get("content-length") || 0) > 8192) throw { status: 413, message: "Request is too large." };
  const raw = await request.text();
  if (raw.length > 8192) throw { status: 413, message: "Request is too large." };
  try { return JSON.parse(raw); } catch { throw { status: 400, message: "Invalid JSON request." }; }
}
function emailOf(value) {
  if (typeof value !== "string") throw { status: 400, message: "Enter a valid email address." };
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw { status: 400, message: "Enter a valid email address." };
  return email;
}
function passOf(value) {
  if (typeof value !== "string" || value.length < 12 || new TextEncoder().encode(value).length > 72)
    throw { status: 400, message: "Password must contain at least 12 characters and at most 72 UTF-8 bytes." };
  return value;
}
async function authUser(request, db) {
  const bearer = request.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) throw { status: 401, message: "Sign in to continue." };
  const tokenValue = bearer.slice(7);
  if (/^[a-f0-9]{64}$/.test(tokenValue)) {
    const key = await hash(tokenValue);
    const record = await db.prepare("SELECT users.id, users.email FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(key, now()).first();
    if (!record) throw { status: 401, message: "Session expired. Sign in again." };
    return record;
  }
  try {
    const { payload } = await jwtVerify(tokenValue, firebaseKeys, {
      issuer: "https://securetoken.google.com/" + FIREBASE_PROJECT,
      audience: FIREBASE_PROJECT,
      algorithms: ["RS256"]
    });
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.email !== "string" || !payload.email_verified)
      throw new Error("Email verification required");
    const uid = "firebase:" + payload.sub;
    await db.prepare("INSERT OR IGNORE INTO users (id,email,password_salt,password_hash,created_at) VALUES (?,?,?,?,?)")
      .bind(uid, uid + "@firebase.invalid", "", "", now()).run();
    return { id: uid, email: payload.email };
  } catch {
    throw { status: 401, message: "Sign in with Firebase and verify your email before creating links." };
  }
}
async function throttle(db, request, action, max) {
  const client = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await hash(client + ":" + action);
  const bucket = Math.floor(now() / 3600);
  await db.prepare("INSERT INTO attempts (identifier, bucket, count) VALUES (?, ?, 1) ON CONFLICT(identifier, bucket) DO UPDATE SET count = count + 1").bind(digest, bucket).run();
  const record = await db.prepare("SELECT count FROM attempts WHERE identifier = ? AND bucket = ?").bind(digest, bucket).first();
  if (record.count > max) throw { status: 429, message: "Too many requests. Try again later." };
}
function wrap(e) {
  if (e?.status && e?.message) return error(e.status === 409 ? "CONFLICT" : "REQUEST_FAILED", e.message, e.status);
  if (e?.message?.includes("UNIQUE constraint")) return error("CONFLICT", "This email or short name is already taken.", 409);
  if (e?.message && /valid|public|name|reserved|HTTPS|URL|short/i.test(e.message) && e instanceof Error && !/database|query|D1|internal/i.test(e.message))
    return error("VALIDATION_ERROR", e.message, 400);
  console.error("Unhandled request failure", e?.stack || String(e));
  return error("SERVER_ERROR", "Request could not be completed.", 500);
}
function isAlias(path) { return /^\/[a-zA-Z0-9][a-zA-Z0-9-]{2,29}$/.test(path); }
const reserved = new Set(["api","actuator","r","favicon","favicon.svg","app.css","app.js","index.html","robots.txt","sitemap.xml"]);
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS" && new URL(request.url).pathname.startsWith("/api/"))
      return new Response(null, {status:204,headers:cors});
    const response = await handleRequest(request, env);
    return withCors(response,cors);
  }
};
async function handleRequest(request, env) {
    try {
      const sendJson = json; const sendError = error;
      const url = new URL(request.url), path = url.pathname, method = request.method;
      const db = env.DB;
      if (!db) throw new Error("D1 database binding DB is missing.");
      if (method === "GET" && path === "/api/health") {
        await db.prepare("SELECT 1 AS ok").first();
        return json({ status: "ok" });
      }
      if (path.startsWith("/api/v1/")) {
        if (method === "POST" && path === "/api/v1/auth/register") {
          await throttle(db, request, "signup", 12);
          const body = await readBody(request), email = emailOf(body.email), password = passOf(body.password);
          if (await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) return error("CONFLICT", "Email already registered.", 409);
          const salt = token(), digest = await passwordHash(password, salt), uid = id();
          await db.prepare("INSERT INTO users (id,email,password_salt,password_hash,created_at) VALUES (?,?,?,?,?)").bind(uid,email,salt,digest,now()).run();
          return json({ id: uid, email, role: "USER" }, 201);
        }
        if (method === "POST" && path === "/api/v1/auth/login") {
          await throttle(db, request, "login", 30);
          const body = await readBody(request), email = emailOf(body.email), password = body.password;
          const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
          if (!user || typeof password !== "string" || (await passwordHash(password,user.password_salt)) !== user.password_hash) return error("UNAUTHORIZED", "Invalid email or password.", 401);
          const accessToken = token();
          await db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await hash(accessToken),user.id,now()+900).run();
          return json({ accessToken, tokenType: "Bearer", expiresIn: 900 });
        }
        if (path === "/api/v1/users/me" && method === "GET") {
          const user = await authUser(request,db);
          return json({ id:user.id,email:user.email,role:"USER" });
        }
        if (path === "/api/v1/links" && method === "GET") {
          const user = await authUser(request, db);
          const result = await db.prepare("SELECT * FROM short_links WHERE owner_id = ? ORDER BY created_at DESC LIMIT 500").bind(user.id).all();
          const origin = getOrigin(request, env.PUBLIC_BASE_URL);
          return json(result.results.map(x => ({id:x.id,code:x.code,destinationUrl:x.destination_url,shortUrl:origin+"/"+x.code,clickCount:x.click_count,createdAt:new Date(x.created_at*1000).toISOString()})));
        }
        if (path === "/api/v1/links" && method === "POST") {
          const user = await authUser(request,db);
          await throttle(db, request, "create", 50);
          const body = await readBody(request);
          const destination = validateDestination(body.destinationUrl);
          const custom = typeof body.customAlias === "string" && !!body.customAlias.trim();
          const code = custom ? validateAlias(body.customAlias) : randomAlias();
          if (await db.prepare("SELECT id FROM short_links WHERE code_lower = ?").bind(code.toLowerCase()).first()) return error("CONFLICT","This short name is already taken.",409);
          const linkId=id(), stamp=now();
          await db.prepare("INSERT INTO short_links (id,owner_id,code,code_lower,destination_url,created_at,click_count) VALUES (?,?,?,?,?,?,0)").bind(linkId,user.id,code,code.toLowerCase(),destination,stamp).run();
          return json({id:linkId,code,destinationUrl:destination,shortUrl:getOrigin(request,env.PUBLIC_BASE_URL)+"/"+code,clickCount:0,createdAt:new Date(stamp*1000).toISOString()},201);
        }
        const del = path.match(/^\/api\/v1\/links\/([0-9a-f-]{36})$/);
        if (method === "DELETE" && del) {
          const user = await authUser(request,db);
          const record = await db.prepare("DELETE FROM short_links WHERE id=? AND owner_id=? RETURNING id").bind(del[1],user.id).first();
          return record ? new Response(null,{status:204}) : error("NOT_FOUND","Link not found.",404);
        }
        const qr = path.match(/^\/api\/v1\/links\/([0-9a-f-]{36})\/qr$/);
        if (method === "GET" && qr) {
          const user = await authUser(request,db);
          const link = await db.prepare("SELECT id,code FROM short_links WHERE id=? AND owner_id=?").bind(qr[1],user.id).first();
          if (!link) return error("NOT_FOUND","Link not found.",404);
          return new Response(renderSVG(getOrigin(request,env.PUBLIC_BASE_URL)+"/"+link.code), {headers:{"content-type":"image/svg+xml; charset=utf-8","content-disposition":"attachment; filename=\"zrain-links-"+link.code+".svg\"","cache-control":"no-store"}});
        }
        return error("NOT_FOUND","API endpoint not found.",404);
      }
      if (method === "GET" && (isAlias(path) || /^\/r\/[a-zA-Z0-9][a-zA-Z0-9-]{2,29}$/.test(path))) {
        const code = path.startsWith("/r/") ? path.slice(3) : path.slice(1);
        if (!reserved.has(code.toLowerCase())) {
          const link = await db.prepare("SELECT destination_url,id FROM short_links WHERE code = ?").bind(code).first();
          if (link) {
            await db.prepare("UPDATE short_links SET click_count = click_count + 1 WHERE id = ?").bind(link.id).run();
            return new Response(null,{status:302,headers:{Location:link.destination_url,"cache-control":"no-store","referrer-policy":"no-referrer"}});
          }
        }
      }
      if (method === "GET" || method === "HEAD") {
        if (isAlias(path) || path.startsWith("/r/")) return error("NOT_FOUND","Short link not found.",404);
        return env.ASSETS.fetch(request);
      }
      return error("NOT_FOUND","Not found.",404);
    } catch (e) { return wrap(e); }
}
