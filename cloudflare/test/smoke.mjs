import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE = "http://127.0.0.1:8787";
const email = "smoke-" + randomUUID() + "@example.org";
const password = "Cloudflare-Smoke-Test-Password-123!";
const alias = "smoke-" + randomUUID().replaceAll("-", "").slice(0, 12);
let token;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function request(path, { method = "GET", body = undefined, bearer = token, redirect = "manual" } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(bearer ? { authorization: "Bearer " + bearer } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect
  });
  const type = response.headers.get("content-type") || "";
  const result = type.includes("application/json") ? await response.json() : null;
  return { response, result };
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const result = await request("/api/health", { bearer: null });
      if (result.response.status === 200 && result.result?.status === "ok") return;
    } catch {}
    await sleep(500);
  }
  throw new Error("Worker failed to start with local D1 within 40 seconds.");
}

await waitUntilReady();
assert.equal((await request("/", { bearer: null })).response.status, 200, "Website homepage is accessible");

const register = await request("/api/v1/auth/register", { method: "POST", bearer: null, body: { email, password } });
assert.equal(register.response.status, 201, JSON.stringify(register.result));
assert.equal(register.result.email, email);

const invalidLogin = await request("/api/v1/auth/login", { method: "POST", bearer: null, body: { email, password: "not-the-right-password" } });
assert.equal(invalidLogin.response.status, 401, JSON.stringify(invalidLogin.result));

const login = await request("/api/v1/auth/login", { method: "POST", bearer: null, body: { email, password } });
assert.equal(login.response.status, 200, JSON.stringify(login.result));
token = login.result.accessToken;
assert.match(token, /^[a-f0-9]{64}$/);

const me = await request("/api/v1/users/me");
assert.equal(me.response.status, 200, JSON.stringify(me.result));
assert.equal(me.result.email, email);

const anonymous = await request("/api/v1/links", { bearer: null });
assert.equal(anonymous.response.status, 401);

const invalidDestination = await request("/api/v1/links", { method: "POST", body: { destinationUrl: "http://localhost/private" } });
assert.equal(invalidDestination.response.status, 400, JSON.stringify(invalidDestination.result));

const created = await request("/api/v1/links", { method: "POST", body: { destinationUrl: "https://www.example.org/page", customAlias: alias } });
assert.equal(created.response.status, 201, JSON.stringify(created.result));
assert.equal(created.result.code, alias);
const linkId = created.result.id;

const duplicate = await request("/api/v1/links", { method: "POST", body: { destinationUrl: "https://www.example.org/again", customAlias: alias } });
assert.equal(duplicate.response.status, 409);

const redirected = await request("/" + alias, { bearer: null });
assert.equal(redirected.response.status, 302);
assert.equal(redirected.response.headers.get("location"), "https://www.example.org/page");

const list = await request("/api/v1/links");
assert.equal(list.response.status, 200);
assert.equal(list.result.length, 1);
assert.equal(list.result[0].clickCount, 1);

const qr = await request("/api/v1/links/" + linkId + "/qr");
assert.equal(qr.response.status, 200);
assert.match(qr.response.headers.get("content-type") || "", /image\/svg\+xml/);

const deleted = await request("/api/v1/links/" + linkId, { method: "DELETE" });
assert.equal(deleted.response.status, 204);
assert.equal((await request("/" + alias, { bearer: null })).response.status, 404);

console.log("Worker + D1: registration, login, auth, aliases, redirects, clicks, QR and deletion PASSED.");
