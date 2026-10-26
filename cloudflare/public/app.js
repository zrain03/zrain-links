import { isValidAlias, aliasSuggestions } from "./alias-utils.js";
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const modal = $("auth-dialog");
  let token = null, email = null, authMode = "signin", links = [], pendingUrl = null, latestLink = null;
  let firebaseAuth, firebaseMethods, currentUser;
  const API = "https://zrain-links.zrain-dev.workers.dev";
  const PUBLIC_LINK_ORIGIN = "https://zrain-links.web.app";
  function publicShortUrl(link) { return PUBLIC_LINK_ORIGIN + "/" + encodeURIComponent(link.code); }
  function verificationView(user) {
    $("verify-email").textContent = user.email || "your email";
    show("verification-panel", true);
    show("auth-tabs", false);
    show("auth-form", false);
    note("verification-message", "");
    if (!modal.open) modal.showModal();
  }
  function authFormView() {
    show("verification-panel", false);
    show("auth-tabs", true);
    show("auth-form", true);
  }
  async function signedIn(user) {
    currentUser = user;
    email = user.email;
    $("header-email").textContent = email;
    show("header-signin", false);
    show("header-user", true);
    show("nav-my-links", true);
    show("my-links", true);
    closeAuth();
    await refresh();
    if (pendingUrl) {
      const target = pendingUrl;
      pendingUrl = null;
      await createLink(target.url, target.alias);
    }
  }
  async function setupFirebase() {
    if (!location.hostname.endsWith(".web.app") && !location.hostname.endsWith(".firebaseapp.com")) {
      throw new Error("Open the published Firebase website to sign in.");
    }
    const response = await fetch("/__/firebase/init.json");
    if (!response.ok) throw new Error("Firebase Hosting configuration is unavailable.");
    const config = await response.json();
    const app = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
    firebaseMethods = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js");
    firebaseAuth = firebaseMethods.getAuth(app.initializeApp(config));
    await firebaseMethods.setPersistence(firebaseAuth, firebaseMethods.browserLocalPersistence);
    firebaseMethods.onAuthStateChanged(firebaseAuth, async user => {
      if (!user) {
        currentUser = null;
        show("my-links", false);
        show("nav-my-links", false);
        show("header-signin", true);
        show("header-user", false);
        return;
      }
      await user.reload().catch(() => {});
      if (firebaseAuth.currentUser?.emailVerified) {
        if (!currentUser || currentUser.uid !== user.uid) await signedIn(user);
        else currentUser = user;
      } else {
        currentUser = null;
        verificationView(user);
      }
    });
  }
  setupFirebase().catch(error => { console.error("Firebase setup failed:", error.message); note("shorten-message", error.message); });
  const show = (id, yes) => { $(id).hidden = !yes; };
  const note = (id, text, success = false) => { const el = $(id); el.textContent = text; el.classList.toggle("ok", success); };
  function toast(text) {
    $("toast").textContent = text;
    show("toast", true);
    window.setTimeout(() => show("toast", false), 3200);
  }
  async function api(path, { method = "GET", body = null, auth = true } = {}) {
    const headers = {};
    if (body !== null) headers["Content-Type"] = "application/json";
    if (auth) {
      if (!currentUser) throw new Error("Sign in and verify your email to continue.");
      headers.Authorization = "Bearer " + await currentUser.getIdToken();
    }
    let response;
    try { response = await fetch(API + path, { method, headers, body: body === null ? undefined : JSON.stringify(body), cache: "no-store" }); }
    catch { throw new Error("Cannot connect to the server. Check your connection."); }
    if (!response.ok) {
      let reason = "";
      try { reason = (await response.json()).message || ""; } catch {}
      if (response.status === 401 && auth) throw new Error(reason || "Please verify your email and sign in again.");
      throw new Error(reason || "Request failed (" + response.status + ").");
    }
    if (response.status === 204) return null;
    return response.headers.get("content-type")?.includes("application/json") ? response.json() : response;
  }
  function openAuth(forShortening = false) {
    authFormView();
    show("auth-context", forShortening);
    if (!modal.open) modal.showModal();
    window.setTimeout(() => $("email").focus(), 0);
  }
  function closeAuth() { if (modal.open) modal.close(); }
  function autoMode() {
    return $("auto-shorten").checked;
  }
  function updateAliasPreview() {
    const automatic = autoMode();
    const input = $("custom-alias");
    input.disabled = automatic;
    input.required = !automatic;
    $("alias-fieldset").classList.toggle("is-automatic", automatic);
    const name = input.value.trim();
    const options = !automatic && name && !isValidAlias(name) ? aliasSuggestions(name) : [];
    const suggestions = $("alias-suggestions"), buttons = $("alias-suggestion-buttons");
    buttons.replaceChildren();
    for (const suggestion of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "alias-choice";
      button.textContent = suggestion;
      button.addEventListener("click", () => {
        input.value = suggestion;
        note("shorten-message", "");
        updateAliasPreview();
        input.focus();
      });
      buttons.append(button);
    }
    suggestions.hidden = options.length === 0;
    const domain = window.location.origin;
    $("alias-prefix").textContent = new URL(domain).host + "/";
    $("preview-url").textContent = new URL(domain).host + "/" + (automatic ? "aB7k9Q2" : (name || "your-name"));
    $("preview-mode").textContent = automatic ? "Automatic short name" : "Custom link name";
    $("alias-preview").textContent = automatic
      ? "We'll generate a random link name for you."
      : "3–30 lowercase letters, numbers or hyphens. Each name must be unique.";
  }
  function updateDestinationPreview() {
    const url = $("long-url").value.trim();
    $("preview-destination").textContent = url || "Add a destination URL";
  }
  
  $("custom-alias").addEventListener("input", updateAliasPreview);
  function setMode(mode) {
    authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach(b => {
      const active = b.dataset.authMode === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    $("auth-submit").textContent = mode === "signin" ? "Sign in →" : "Create account →";
    $("auth-caption").textContent = mode === "signin" ? "Sign in to create and manage your links." : "Create an account to save your links.";
    $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
    $("password").minLength = mode === "signin" ? 1 : 12;
    $("password-hint").textContent = mode === "signin" ? "" : "(at least 12 characters)";
    note("form-message", "");
  }
  function signout() {
    token = null; email = null; currentUser = null; links = []; latestLink = null;
    $("password").value = "";
    show("my-links", false); show("nav-my-links", false); show("header-signin", true); show("header-user", false); show("latest-result", false);
  }
  async function submitAuth(event) {
    event.preventDefault();
    const button = $("auth-submit"); button.disabled = true; note("form-message", "");
    const accountEmail = $("email").value.trim(), password = $("password").value;
    try {
      if (!firebaseAuth || !firebaseMethods) throw new Error("Firebase is not ready. Refresh the page.");
      if (authMode === "signup") {
        const result = await firebaseMethods.createUserWithEmailAndPassword(firebaseAuth, accountEmail, password);
        await firebaseMethods.sendEmailVerification(result.user);
        $("password").value = "";
        verificationView(result.user);
        return;
      }
      const result = await firebaseMethods.signInWithEmailAndPassword(firebaseAuth, accountEmail, password);
      if (!result.user.emailVerified) {
        verificationView(result.user);
        return;
      }
      $("password").value = "";
      await signedIn(result.user);
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/weak-password": "Choose a stronger password.",
        "auth/operation-not-allowed": "Enable Email/Password in Firebase Authentication.",
        "auth/too-many-requests": "Too many attempts. Try again later."
      };
      note("form-message", messages[error.code] || error.message);
    } finally { button.disabled = false; }
  }
  async function createLink(url, alias) {
    const button = $("shorten-button"); button.disabled = true; note("shorten-message", "");
    try {
      if (!/^https:\/\//i.test(url)) throw new Error("Please enter a link starting with https://");
      const link = await api("/api/v1/links", { method: "POST", body: { destinationUrl: url, customAlias: alias || null } });
      latestLink = link;
      $("result-url").textContent = publicShortUrl(link);
      $("result-url").href = publicShortUrl(link);
      $("result-destination").textContent = link.destinationUrl;
      show("latest-result", true);
      $("long-url").value = "";
      $("custom-alias").value = "";
      $("auto-shorten").checked = false;
      updateAliasPreview();
      await refresh();
      $("latest-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) { note("shorten-message", error.message); }
    finally { button.disabled = false; }
  }
  function onShorten(event) {
    event.preventDefault();
    const url = $("long-url").value.trim();
    if (!/^https:\/\//i.test(url)) { note("shorten-message", "Please paste a public HTTPS website link."); return; }
    const alias = autoMode() ? "" : $("custom-alias").value.trim();
    if (!autoMode() && !isValidAlias(alias)) { note("shorten-message", "Choose a valid name below, or use 3–30 lowercase letters, numbers or hyphens."); updateAliasPreview(); $("custom-alias").focus(); return; }
    if (!currentUser) { pendingUrl = { url, alias }; openAuth(true); return; }
    createLink(url, alias);
  }
  function render() {
    $("total-links").textContent = String(links.length);
    $("total-clicks").textContent = links.reduce((sum, l) => sum + (l.clickCount || 0), 0).toLocaleString();
    $("links-list").replaceChildren();
    if (!links.length) {
      const empty = document.createElement("div"); empty.className = "empty-links";
      const heading = document.createElement("strong"); heading.textContent = "No links yet";
      const info = document.createElement("p"); info.textContent = "Paste a URL above to create your first link.";
      empty.append(heading, info); $("links-list").append(empty); return;
    }
    for (const link of links) {
      const card = document.createElement("article"); card.className = "link-card";
      const body = document.createElement("div"); body.className = "link-core";
      const anchor = document.createElement("a"); anchor.href = publicShortUrl(link); anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.textContent = publicShortUrl(link);
      const target = document.createElement("p"); target.className = "destination"; target.textContent = link.destinationUrl;
      const meta = document.createElement("div"); meta.className = "link-meta";
      const visits = document.createElement("span"); visits.textContent = (link.clickCount || 0) + " visits";
      const created = document.createElement("span"); created.textContent = new Date(link.createdAt).toLocaleDateString();
      meta.append(visits, created); body.append(anchor, target, meta);
      const actions = document.createElement("div"); actions.className = "link-actions";
      function action(name, handler, extra = "") {
        const b = document.createElement("button"); b.type = "button"; b.textContent = name; b.className = extra; b.addEventListener("click", handler); actions.append(b);
      }
      action("Copy", () => copyLink(publicShortUrl(link)));
      action("QR code", () => downloadQr(link));
      action("Delete", async () => {
        if (!window.confirm("Delete this short link? It will stop working.")) return;
        try {
          await api("/api/v1/links/" + encodeURIComponent(link.id), { method: "DELETE" });
          if (latestLink?.id === link.id) { latestLink = null; show("latest-result", false); }
          await refresh(); toast("Link deleted.");
        } catch (error) { toast(error.message); }
      }, "danger");
      card.append(body, actions); $("links-list").append(card);
    }
  }
  async function refresh() {
    note("list-status", "Loading your links...");
    try { links = await api("/api/v1/links"); render(); note("list-status", ""); }
    catch (error) { note("list-status", error.message); }
  }
  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); toast("Link copied!"); }
    catch { toast("Copy unavailable. Select the link and copy it manually."); }
  }
  async function downloadQr(link) {
    try {
      const response = await api("/api/v1/links/" + encodeURIComponent(link.id) + "/qr");
      const blob = await response.blob(), url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "zrain-links-" + link.code + ".svg";
      document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) { toast(error.message); }
  }
  document.querySelectorAll("[data-auth-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.authMode)));
  $("verified-button").addEventListener("click", async () => {
    const user = firebaseAuth?.currentUser;
    if (!user) { authFormView(); return; }
    try {
      await user.reload();
      if (user.emailVerified) { await user.getIdToken(true); await signedIn(user); }
      else note("verification-message", "Email not verified yet. Open your verification email, then try again.");
    } catch (e) { note("verification-message", e.message); }
  });
  $("resend-verification").addEventListener("click", async () => {
    const user = firebaseAuth?.currentUser;
    if (!user) return;
    try { await firebaseMethods.sendEmailVerification(user); note("verification-message", "New verification email sent.", true); }
    catch (e) { note("verification-message", e.message); }
  });
  $("switch-account").addEventListener("click", async () => {
    await firebaseMethods.signOut(firebaseAuth);
    authFormView();
    setMode("signin");
  });
  $("header-signin").addEventListener("click", () => openAuth(false));
  $("header-signout").addEventListener("click", async () => { if (firebaseAuth) await firebaseMethods.signOut(firebaseAuth); signout(); toast("Signed out."); });
  $("close-auth").addEventListener("click", closeAuth);
  modal.addEventListener("click", e => { if (e.target === modal) closeAuth(); });
  $("toggle-password").addEventListener("click", () => {
    const field = $("password"), visible = field.type === "password";
    field.type = visible ? "text" : "password";
    $("toggle-password").textContent = visible ? "Hide" : "Show";
    $("toggle-password").setAttribute("aria-pressed", String(visible));
  });
  $("auth-form").addEventListener("submit", submitAuth);
  $("shorten-form").addEventListener("submit", onShorten);
  $("refresh-links").addEventListener("click", refresh);
  $("result-copy").addEventListener("click", () => { if (latestLink) copyLink(publicShortUrl(latestLink)); });
  $("result-qr").addEventListener("click", () => { if (latestLink) downloadQr(latestLink); });
  $("auto-shorten").addEventListener("change", updateAliasPreview);
  $("long-url").addEventListener("input", updateDestinationPreview);
  updateAliasPreview();
  updateDestinationPreview();
  setMode("signin");
  })();
