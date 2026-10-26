import test from "node:test";
import assert from "node:assert/strict";
import {validateAlias,validateDestination} from "../src/core.js";
test("accepts safe aliases",()=>assert.equal(validateAlias("claimmp"),"claimmp"));
test("rejects reserved and invalid names",()=>{for(const name of ["api","r","UPPER","ab","trailing-","a/b"])assert.throws(()=>validateAlias(name));});
test("allows public HTTPS destinations",()=>assert.equal(validateDestination("https://example.org/page"),"https://example.org/page"));
test("rejects private and insecure destinations",()=>{for(const url of ["http://example.org","https://localhost/","https://127.0.0.1","javascript:alert(1)","https://site.local","https://user:pass@example.org"])assert.throws(()=>validateDestination(url));});

test("Firebase Hosting remains the short-link public origin", async()=>{ const fs=await import("node:fs/promises"); const worker=await fs.readFile(new URL("../src/index.js",import.meta.url),"utf8"); assert.match(worker,/const PUBLIC_LINK_ORIGIN = "https:\/\/zrain-links\.web\.app"/); assert.doesNotMatch(worker,/getOrigin\(request, env\.PUBLIC_BASE_URL\)/); });

test("preserves query parameters and hash fragments", () => {
  const url = "https://zrain03.github.io/zrain-auth-starter/?utm_source=chatgpt.com#playground";
  assert.equal(validateDestination(url), url);
});
test("suggests safe names for human-entered titles", async () => {
  const { aliasSuggestions, isValidAlias } = await import("../public/alias-utils.js");
  assert.deepEqual(aliasSuggestions("Guess The Flag"), ["guess-the-flag", "guesstheflag"]);
  assert.deepEqual(aliasSuggestions("Memory Rush"), ["memory-rush", "memoryrush"]);
  assert.equal(isValidAlias("guess-the-flag"), true);
  assert.equal(isValidAlias("Guess The Flag"), false);
  assert.deepEqual(aliasSuggestions("API"), []);
});

test("link creation uses canonical domain and never calls the removed origin helper", async () => {
  const fs = await import("node:fs/promises");
  const worker = await fs.readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /shortUrl: PUBLIC_LINK_ORIGIN \+ "\/" \+ code/);
  assert.doesNotMatch(worker, /getOrigin\(request,\s*env\.PUBLIC_BASE_URL\)/);
  assert.match(worker, /"ALIAS_TAKEN"/);
  assert.match(worker, /\/api\/v1\/links\/availability/);
});

test("Malaysia creation time uses Asia/Kuala_Lumpur consistently", async () => {
  const {formatMalaysiaTime} = await import("../public/time-format.js");
  const output = formatMalaysiaTime("2026-10-26T05:00:00.000Z");
  assert.match(output, /26 Oct 2026/);
  assert.match(output, /1:00:00 pm MYT/i);
  assert.equal(formatMalaysiaTime("not-a-date"), "Creation time unavailable");
});
test("password recovery and Google authentication use Firebase SDK", async () => {
  const fs = await import("node:fs/promises");
  const script = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(script, /sendPasswordResetEmail\(firebaseAuth, address\)/);
  assert.match(script, /signInWithPopup\(firebaseAuth, provider\)/);
  assert.match(script, /formatMalaysiaTime\(link.createdAt\)/);
});

test("account linking preserves Firebase UID and timestamps use MYT", async () => {
  const fs = await import("node:fs/promises");
  const script = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(script, /linkWithPopup\(firebaseAuth\.currentUser, provider\)/);
  assert.match(script, /signInWithPopup\(firebaseAuth, provider\)/);
  assert.match(script, /sendPasswordResetEmail\(firebaseAuth, address\)/);
  assert.match(script, /formatMalaysiaTime\(link\.createdAt\)/);
});
