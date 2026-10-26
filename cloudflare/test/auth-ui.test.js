import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("login, signup, email verification and password recovery are separate views", async () => {
  const [html, script, css] = await Promise.all([
    read("../public/index.html"), read("../public/app.js"), read("../public/app.css")
  ]);
  for (const id of ["auth-form", "auth-tabs", "forgot-password-row", "confirm-password-section",
    "reset-password-panel", "reset-password-form", "verification-panel", "google-auth-section",
    "google-message", "google-redirect", "back-to-signin"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(script, /show\("forgot-password-row", signingIn\)/);
  assert.match(script, /show\("confirm-password-section", !signingIn\)/);
  assert.match(script, /\$\("confirm-password"\)\.disabled = signingIn/);
  assert.match(script, /Passwords do not match/);
  assert.match(script, /show\("reset-password-panel", true\)/);
  assert.match(script, /show\("google-auth-section", false\)/);
  assert.match(css, /\.auth-dialog \[hidden\]\{display:none!important\}/);
});

test("Google sign-in errors are shown near the Google control with redirect fallback", async () => {
  const [html, script] = await Promise.all([read("../public/index.html"), read("../public/app.js")]);
  assert.match(html, /id="google-message"/);
  assert.match(html, /id="google-redirect"/);
  assert.match(script, /signInWithPopup\(firebaseAuth, provider\)/);
  assert.match(script, /signInWithRedirect\(firebaseAuth, provider\)/);
  assert.match(script, /getRedirectResult\(firebaseAuth\)/);
  assert.match(script, /note\("google-message", googleErrorMessage\(error\)\)/);
  assert.match(script, /\$\("google-label"\)\.textContent = "Opening Google…"/);
});

test("password reset uses Firebase, does not expose registered account emails", async () => {
  const script = await read("../public/app.js");
  assert.match(script, /sendPasswordResetEmail\(firebaseAuth, address\)/);
  assert.match(script, /If this address belongs to an email\/password account/);
  assert.match(script, /\$\("reset-password-form"\)\.addEventListener\("submit"/);
});

test("existing link details persist if Google popup requires explicit redirect", async () => {
  const script = await read("../public/app.js");
  assert.match(script, /PENDING_LINK_KEY/);
  assert.match(script, /sessionStorage\.setItem\(PENDING_LINK_KEY, JSON\.stringify\(pendingUrl\)\)/);
  assert.match(script, /sessionStorage\.removeItem\(PENDING_LINK_KEY\)/);
});

test("auth resources have a coordinated cache-busting revision", async () => {
  const html = await read("../public/index.html");
  assert.match(html, /app\.css\?v=auth-flow-20261026-3/);
  assert.match(html, /app\.js\?v=auth-flow-20261026-3/);
});
