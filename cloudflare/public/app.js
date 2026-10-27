import { formatMalaysiaTime } from "./time-format.js?v=myt-seconds-20261026-2";
import { isValidAlias, aliasSuggestions } from "./alias-utils.js";
import { openQrPreview } from "./qr-preview.js?v=qr-preview-20261027-1";
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const modal = $("auth-dialog");
  let token = null, email = null, authMode = "signin", links = [], pendingUrl = null, latestLink = null;
  let firebaseAuth, firebaseMethods, currentUser, firebaseInitError = null;
  const API = "https://zrain-links.zrain-dev.workers.dev";
  const PUBLIC_LINK_ORIGIN = "https://zrain-links.web.app";
  const PENDING_LINK_KEY = "zrain-links:pending-link";
  try {
    const queued = sessionStorage.getItem(PENDING_LINK_KEY);
    if (queued) pendingUrl = JSON.parse(queued);
    sessionStorage.removeItem(PENDING_LINK_KEY);
  } catch { /* Private browsing can disable session storage. */ }
  function publicShortUrl(link) { return PUBLIC_LINK_ORIGIN + "/" + encodeURIComponent(link.code); }
  function authHeading(title, description) {
    $("auth-title").textContent = title;
    $("auth-caption").textContent = description;
  }
  function verificationView(user) {
    authHeading("Verify your email", "One quick step before you can save your links.");
    $("verify-email").textContent = user.email || "your email";
    show("verification-panel", true);
    show("reset-password-panel", false);
    show("auth-tabs", false);
    show("auth-form", false);
    show("google-auth-section", false);
    note("verification-message", "");
    if (!modal.open) modal.showModal();
  }
  function authFormView() {
    show("verification-panel", false);
    show("reset-password-panel", false);
    show("auth-tabs", true);
    show("auth-form", true);
    show("google-auth-section", true);
  }
  function resetPasswordView() {
    authHeading("Reset your password", "We'll email you a secure password reset link.");
    show("verification-panel", false);
    show("auth-tabs", false);
    show("auth-form", false);
    show("google-auth-section", false);
    show("reset-password-panel", true);
    $("reset-email").value = $("email").value.trim();
    note("reset-message", "");
    window.setTimeout(() => $("reset-email").focus({preventScroll:true}), 0);
  }
  async function signedIn(user) {
    currentUser = user;
    email = user.email;
    $("header-email").textContent = email;
    show("connect-google-panel", !user.providerData.some(provider => provider.providerId === "google.com"));
    note("connect-google-message", "");
    show("header-signin", false);
    show("header-user", true);
    show("nav-my-links", true);
    show("nav-admin", false);
    show("my-links", true);
    api("/api/v1/admin/me").then(() => {
      if (currentUser?.uid === user.uid) show("nav-admin", true);
    }).catch(() => show("nav-admin", false));
    closeAuth();
    await refresh();
    window.dispatchEvent(new Event("zrain-auth-change"));
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
    firebaseMethods.getRedirectResult(firebaseAuth).catch(error => {
      setMode("signin");
      if (!modal.open) modal.showModal();
      note("google-message", googleErrorMessage(error));
    });
    firebaseMethods.onAuthStateChanged(firebaseAuth, async user => {
      if (!user) {
        currentUser = null;
        window.dispatchEvent(new Event("zrain-auth-change"));
        show("my-links", false);
        show("nav-my-links", false);
        show("nav-admin", false);
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
  setupFirebase().catch(error => {
    firebaseInitError = error.message || "Authentication could not start.";
    console.error("Firebase setup failed:", firebaseInitError);
    note("shorten-message", firebaseInitError);
    note("google-message", "Sign-in is unavailable: " + firebaseInitError);
  });
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
      const failure = new Error(reason || "Request failed (" + response.status + ").");
      failure.status = response.status;
      if (response.status === 401 && auth) failure.message = reason || "Please verify your email and sign in again.";
      throw failure;
    }
    if (response.status === 204) return null;
    return response.headers.get("content-type")?.includes("application/json") ? response.json() : response;
  }
  function openAuth(forShortening = false) {
    setMode("signin");
    show("auth-context", forShortening);
    if (!modal.open) modal.showModal();
    window.setTimeout(() => $("email").focus({preventScroll:true}), 0);
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
        checkAliasAvailability();
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
  
  $("custom-alias").addEventListener("input", () => { updateAliasPreview(); checkAliasAvailability(); });
  function setMode(mode) {
    authMode = mode;
    authFormView();
    for (const button of document.querySelectorAll("[data-auth-mode]")) {
      const active = button.dataset.authMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const signingIn = mode === "signin";
    authHeading(signingIn ? "Welcome back" : "Create your account",
      signingIn ? "Sign in to manage your links." : "Sign up to save and manage your links.");
    $("auth-submit").textContent = signingIn ? "Sign in →" : "Create account →";
    $("password").autocomplete = signingIn ? "current-password" : "new-password";
    $("password").minLength = signingIn ? 1 : 12;
    $("password-hint").textContent = signingIn ? "" : "(at least 12 characters)";
    show("forgot-password-row", signingIn);
    show("signup-name-section", !signingIn);
    show("password-guidance", !signingIn);
    $("full-name").disabled = signingIn;
    $("full-name").required = !signingIn;
    show("confirm-password-section", !signingIn);
    $("confirm-password").disabled = signingIn;
    $("confirm-password").required = !signingIn;
    $("confirm-password").value = "";
    for (const [fieldId, buttonId] of [["password", "toggle-password"], ["confirm-password", "toggle-confirm-password"]]) {
      $(fieldId).type = "password";
      $(buttonId).textContent = "Show";
      $(buttonId).setAttribute("aria-pressed", "false");
    }
    show("google-redirect", false);
    note("form-message", "");
    note("google-message", "");
  }
  function signout() {
    window.dispatchEvent(new Event("zrain-auth-change"));
    token = null; email = null; currentUser = null; links = []; latestLink = null;
    show("connect-google-panel", false);
    $("password").value = "";
    show("my-links", false); show("nav-my-links", false); show("nav-admin", false); show("header-signin", true); show("header-user", false); show("latest-result", false);
  }
  async function submitAuth(event) {
    event.preventDefault();
    const button = $("auth-submit"); button.disabled = true; note("form-message", "");
    const accountEmail = $("email").value.trim(), password = $("password").value;
    try {
      if (!firebaseAuth || !firebaseMethods) throw new Error("Firebase is not ready. Refresh the page.");
      if (authMode === "signup") {
        const fullName = $("full-name").value.trim().replace(/\s+/g, " ");
        if (!fullName || fullName.length > 80) {
          throw new Error("Enter your full name (up to 80 characters).");
        }
        if (password.length < 12) {
          throw new Error("Use at least 12 characters for your password.");
        }
        if (password !== $("confirm-password").value) {
          throw new Error("Passwords do not match. Please check both fields.");
        }
        const result = await firebaseMethods.createUserWithEmailAndPassword(firebaseAuth, accountEmail, password);
        await firebaseMethods.updateProfile(result.user, { displayName: fullName });
        await firebaseMethods.sendEmailVerification(result.user);
        $("password").value = "";
        $("confirm-password").value = "";
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
    } catch (error) {
      note("shorten-message", explainApiError(error));
      if (error?.status === 409) checkAliasAvailability();
    } finally { button.disabled = false; }
  }
  function explainApiError(error) {
    if (error?.status === 409) return "This link name is already taken. Please choose a different name.";
    if (error?.status === 429) return "Too many requests. Please try again later.";
    if (error?.status === 401) return "Please sign in again, then create your link.";
    if (error?.status === 400) return error.message || "Check the URL and link name.";
    return error?.message || "Something went wrong. Check My links before trying again.";
  }
  let availabilityTimer = null, availabilitySequence = 0;
  async function checkAliasAvailability() {
    const sequence = ++availabilitySequence;
    clearTimeout(availabilityTimer);
    const alias = $("custom-alias").value.trim();
    const status = $("alias-availability");
    status.textContent = "";
    status.classList.remove("ok");
    if (autoMode() || !isValidAlias(alias)) return;
    status.textContent = "Checking name availability…";
    availabilityTimer = setTimeout(async () => {
      try {
        const response = await api("/api/v1/links/availability?name=" + encodeURIComponent(alias), {auth:false});
        if (sequence !== availabilitySequence || $("custom-alias").value.trim() !== alias) return;
        status.textContent = response.available ? "✓ This name is available." : "This name is already taken. Please choose another.";
        status.classList.toggle("ok", !!response.available);
      } catch (error) {
        if (sequence !== availabilitySequence) return;
        status.textContent = "Could not check availability right now. You can still try creating the link.";
      }
    }, 450);
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
      const created = document.createElement("span"); created.textContent = formatMalaysiaTime(link.createdAt);
      meta.append(visits, created); body.append(anchor, target, meta);
      const actions = document.createElement("div"); actions.className = "link-actions";
      function action(name, handler, extra = "") {
        const b = document.createElement("button"); b.type = "button"; b.textContent = name; b.className = extra; b.addEventListener("click", handler); actions.append(b);
      }
      action("Copy", () => copyLink(publicShortUrl(link)));
      action("QR code", () => showQr(link));
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
  function showQr(link) {
    return openQrPreview({
      fetchQr: () => api("/api/v1/links/" + encodeURIComponent(link.id) + "/qr"),
      shortUrl: publicShortUrl(link),
      fileName: "zrain-links-" + link.code + ".svg"
    });
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
  $("connect-google").addEventListener("click", async () => {
    const button = $("connect-google");
    button.disabled = true;
    note("connect-google-message", "");
    try {
      if (!firebaseAuth?.currentUser || !firebaseMethods) throw new Error("Please sign in first.");
      const provider = new firebaseMethods.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account"});
      const linked = await firebaseMethods.linkWithPopup(firebaseAuth.currentUser, provider);
      await linked.user.getIdToken(true);
      show("connect-google-panel", false);
      toast("Google connected to your existing account.");
    } catch (error) {
      const messages = {
        "auth/credential-already-in-use": "That Google account belongs to another user. Nothing was changed.",
        "auth/email-already-in-use": "That Google email is already used by another account. Nothing was changed.",
        "auth/provider-already-linked": "Google is already connected.",
        "auth/popup-blocked": "Allow pop-ups and try again.",
        "auth/popup-closed-by-user": "Google linking was cancelled.",
        "auth/operation-not-allowed": "Enable the Google provider in Firebase Authentication first."
      };
      note("connect-google-message", messages[error.code] || error.message || "Unable to connect Google. No links were changed.");
    } finally { button.disabled = false; }
  });
  function googleErrorMessage(error) {
    const messages = {
      "auth/account-exists-with-different-credential": "An account with this email already uses another sign-in method. Sign in with that method first, then use Connect Google in My links to keep your existing links.",
      "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups or choose Continue in this tab below.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again.",
      "auth/operation-not-allowed": "Google sign-in has not been enabled in Firebase Authentication. Please contact Zrain support.",
      "auth/unauthorized-domain": "Google sign-in is not authorized for this website domain. Please contact Zrain support.",
      "auth/cancelled-popup-request": "Another Google window was opened. Please try again.",
      "auth/network-request-failed": "Network connection failed. Check your connection and try again.",
      "auth/operation-not-supported-in-this-environment": "Google popup sign-in is not supported in this browser. Use Continue in this tab below."
    };
    return messages[error?.code] || (error?.message?.startsWith("Sign-in is unavailable:") || error?.message?.startsWith("Authentication is still loading.") ? error.message : "Unable to sign in with Google. Please try again, or sign in with email.");
  }
  $("google-signin").addEventListener("click", async () => {
    const button = $("google-signin");
    button.disabled = true;
    $("google-label").textContent = "Opening Google…";
    note("google-message", "Opening Google's secure sign-in window…");
    show("google-redirect", false);
    try {
      if (!firebaseAuth || !firebaseMethods) throw new Error(firebaseInitError ? "Sign-in is unavailable: " + firebaseInitError : "Authentication is still loading. Please try again.");
      const provider = new firebaseMethods.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account"});
      const result = await firebaseMethods.signInWithPopup(firebaseAuth, provider);
      if (!result.user.emailVerified) throw new Error("Email verification is required.");
      await signedIn(result.user);
    } catch (error) {
      note("google-message", googleErrorMessage(error));
      if (["auth/popup-blocked","auth/operation-not-supported-in-this-environment"].includes(error?.code)) {
        show("google-redirect", true);
      }
    } finally {
      button.disabled = false;
      $("google-label").textContent = "Continue with Google";
    }
  });
  $("google-redirect").addEventListener("click", async () => {
    const button = $("google-redirect");
    button.disabled = true;
    note("google-message", "Redirecting to Google's sign-in page…");
    try {
      if (!firebaseAuth || !firebaseMethods) throw new Error("Firebase is not ready.");
      const provider = new firebaseMethods.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account"});
      try {
        if (pendingUrl) sessionStorage.setItem(PENDING_LINK_KEY, JSON.stringify(pendingUrl));
      } catch { /* Continue without preserving a pending link. */ }
      await firebaseMethods.signInWithRedirect(firebaseAuth, provider);
    } catch (error) {
      note("google-message", googleErrorMessage(error));
      button.disabled = false;
    }
  });
  $("forgot-password").addEventListener("click", () => resetPasswordView());
  $("back-to-signin").addEventListener("click", () => setMode("signin"));
  $("reset-password-form").addEventListener("submit", async event => {
    event.preventDefault();
    const address = $("reset-email").value.trim();
    const button = $("reset-submit");
    button.disabled = true;
    button.textContent = "Sending…";
    note("reset-message", "");
    try {
      if (!firebaseAuth || !firebaseMethods) throw new Error("Firebase is not ready.");
      await firebaseMethods.sendPasswordResetEmail(firebaseAuth, address);
      note("reset-message",
        "If this address belongs to an email/password account, you'll receive a reset link. Check your inbox and spam folder.", true);
    } catch (error) {
      if (error.code === "auth/too-many-requests") {
        note("reset-message", "Too many attempts. Please wait before requesting another email.");
      } else if (error.code === "auth/invalid-email") {
        note("reset-message", "Please enter a valid email address.");
      } else {
        note("reset-message", "Reset instructions could not be sent right now. Please try again later.");
      }
    } finally {
      button.disabled = false;
      button.textContent = "Send reset link";
    }
  });
  $("header-signin").addEventListener("click", () => openAuth(false));
  $("header-signout").addEventListener("click", async () => { if (firebaseAuth) await firebaseMethods.signOut(firebaseAuth); signout(); toast("Signed out."); });
  $("close-auth").addEventListener("click", closeAuth);
  modal.addEventListener("click", e => { if (e.target === modal) closeAuth(); });
  function toggleVisibility(fieldId, buttonId) {
    const field = $(fieldId), button = $(buttonId), visible = field.type === "password";
    field.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", (visible ? "Hide" : "Show") + (fieldId === "confirm-password" ? " confirmation password" : " password"));
  }
  $("toggle-password").addEventListener("click", () => toggleVisibility("password", "toggle-password"));
  $("toggle-confirm-password").addEventListener("click", () => toggleVisibility("confirm-password", "toggle-confirm-password"));
  $("auth-form").addEventListener("submit", submitAuth);
  $("shorten-form").addEventListener("submit", onShorten);
  $("refresh-links").addEventListener("click", refresh);
  $("result-copy").addEventListener("click", () => { if (latestLink) copyLink(publicShortUrl(latestLink)); });
  $("result-qr").addEventListener("click", () => { if (latestLink) showQr(latestLink); });
  $("auto-shorten").addEventListener("change", () => { updateAliasPreview(); checkAliasAvailability(); });
  $("long-url").addEventListener("input", updateDestinationPreview);
  // The two independent link experiences reuse the existing verified Firebase session.
  // No separate auth account, and no credentials exposed globally.
  window.ZrainVisitsBridge = {
    getUser: () => currentUser,
    openAuth: () => openAuth(false),
    api: (path, options) => api(path, options)
  };
  updateAliasPreview();
  updateDestinationPreview();
  setMode("signin");
  })();
