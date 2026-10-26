import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adminIdentityMatches } from "../src/admin-auth.js";
import { formatMalaysiaTime } from "../public/time-format.js";

const read = name => readFile(new URL(name, import.meta.url), "utf8");
const claims = { sub: "demo-admin-uid", email: "zrain.dev@gmail.com", email_verified: true, firebase: {sign_in_provider:"google.com"} };

test("admin access requires the exact configured UID, verified address and Google provider", () => {
  assert.equal(adminIdentityMatches(claims, "demo-admin-uid"), true);
  assert.equal(adminIdentityMatches(claims, ""), false);
  assert.equal(adminIdentityMatches(claims, "other-uid"), false);
  assert.equal(adminIdentityMatches({...claims, email:"attacker@example.com"}, "demo-admin-uid"), false);
  assert.equal(adminIdentityMatches({...claims, email_verified:false}, "demo-admin-uid"), false);
  assert.equal(adminIdentityMatches({...claims, firebase:{sign_in_provider:"password"}}, "demo-admin-uid"), false);
});

test("server protects every privileged route and admin UID stays outside source", async () => {
  const [worker, admin, page, ui] = await Promise.all([
    read("../src/index.js"), read("../src/admin.js"),read("../public/admin.html"),read("../public/admin.js")
  ]);
  assert.match(worker, /handleAdmin\(request, env, db\)/);
  assert.match(admin, /jwtVerify\(authorization.slice\(7\), firebaseKeys/);
  assert.match(admin, /adminIdentityMatches\(verified.payload, env.ZRAIN_ADMIN_FIREBASE_UID\)/);
  assert.match(admin, /recentAuth\(admin\)/);
  assert.match(admin, /Firebase service account/);
  assert.match(admin, /accounts:/);
  assert.match(admin, /Firebase user still exists/);
  assert.doesNotMatch(page, /ZRAIN_ADMIN_FIREBASE_UID|FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(ui, /ZRAIN_ADMIN_FIREBASE_UID|FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON/);
  assert.match(ui, /adminApi\("\/api\/v1\/admin\/me"\)/);
  assert.match(admin, /db\.batch\(\[/);
});

test("all displayed link timestamps include hours, minutes, seconds and Malaysian timezone", () => {
  const result = formatMalaysiaTime("2026-10-26T05:04:09.000Z");
  assert.match(result, /26 Oct 2026/);
  assert.match(result, /1:04:09 pm MYT/i);
});

test("admin dashboard exposes safe link, Firebase user and orphan record workflows", async () => {
  const [page, ui, app] = await Promise.all([
    read("../public/admin.html"),read("../public/admin.js"),read("../public/app.js")
  ]);
  for (const id of ["admin-content","admin-links-list","admin-users-list","d1-accounts-list",
     "tab-links","tab-users","tab-d1","metric-links","metric-visits"]) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
  assert.match(ui, /confirm: typed/);
  assert.match(app, /api\/v1\/admin\/me/);
});
