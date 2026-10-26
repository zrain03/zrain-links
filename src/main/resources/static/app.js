"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const modal = $("auth-dialog");
  let token = null, email = null, authMode = "signin", links = [], pendingUrl = null, latestLink = null;
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
    if (auth && token) headers.Authorization = "Bearer " + token;
    let response;
    try { response = await fetch(path, { method, headers, body: body === null ? undefined : JSON.stringify(body), cache: "no-store" }); }
    catch { throw new Error("Cannot connect to the server. Check your connection."); }
    if (!response.ok) {
      let reason = "";
      try { reason = (await response.json()).message || ""; } catch {}
      if (response.status === 401 && auth) {
        signout();
        throw new Error("Your session has expired. Please sign in again.");
      }
      throw new Error(reason || "Request failed (" + response.status + ").");
    }
    if (response.status === 204) return null;
    return response.headers.get("content-type")?.includes("application/json") ? response.json() : response;
  }
  function openAuth(forShortening = false) {
    show("auth-context", forShortening);
    if (!modal.open) modal.showModal();
    window.setTimeout(() => $("email").focus(), 0);
  }
  function closeAuth() { if (modal.open) modal.close(); }
  let domains = {primary: window.location.origin, shortDomain: "", shortAvailable: false};
  function selectedShortDomain() {
    return domains.shortAvailable && $("use-short-domain").checked;
  }
  function updateAliasPreview() {
    const base = selectedShortDomain() ? domains.shortDomain : domains.primary;
    const alias = $("custom-alias").value.trim();
    $("alias-prefix").textContent = new URL(base).host + " /";
    $("alias-preview").textContent = alias
      ? "Preview: " + base + "/" + alias
      : "Leave blank to generate a random name.";
  }
  async function loadDomains() {
    try {
      const data = await api("/api/v1/links/domains", {auth:false});
      domains = data;
      const active = Boolean(data.shortAvailable && data.shortDomain);
      show("domain-option", active);
      if (!active) $("use-short-domain").checked = false;
      $("domain-hint").textContent = active
        ? "Choose your regular link domain or the shorter address."
        : "Shorter domain is not connected yet. Your regular domain will be used.";
    } catch {
      $("domain-hint").textContent = "Domain options could not be checked. The regular domain will be used.";
    }
    updateAliasPreview();
  }
  $("custom-alias").addEventListener("input", updateAliasPreview);
  $("use-short-domain").addEventListener("change", updateAliasPreview);
    function setMode(mode) {
    authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach(b => {
      const active = b.dataset.authMode === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    $("auth-submit").textContent = mode === "signin" ? "Sign in →" : "Create account →";
    $("auth-caption").textContent = mode === "signin" ? "Sign in to create and manage your links." : "Create an account to save your short links.";
    $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
    $("password").minLength = mode === "signin" ? 1 : 12;
    $("password-hint").textContent = mode === "signin" ? "" : "(at least 12 characters)";
    note("form-message", "");
  }
  function signout() {
    token = null; email = null; links = []; latestLink = null;
    $("password").value = "";
    show("my-links", false); show("nav-my-links", false); show("header-signin", true); show("header-user", false); show("latest-result", false);
  }
  async function submitAuth(event) {
    event.preventDefault();
    const button = $("auth-submit"); button.disabled = true; note("form-message", "");
    const accountEmail = $("email").value.trim(), password = $("password").value;
    try {
      if (authMode === "signup") {
        await api("/api/v1/auth/register", { method: "POST", body: { email: accountEmail, password }, auth: false });
        setMode("signin");
        note("form-message", "Account created! Sign in with the password you just chose.", true);
        return;
      }
      const result = await api("/api/v1/auth/login", { method: "POST", body: { email: accountEmail, password }, auth: false });
      if (!result.accessToken) throw new Error("Sign-in response did not include a token.");
      token = result.accessToken; email = accountEmail;
      $("header-email").textContent = email;
      show("header-signin", false); show("header-user", true); show("nav-my-links", true); show("my-links", true);
      $("password").value = "";
      closeAuth();
      await refresh();
      if (pendingUrl !== null) {
        const target = pendingUrl; pendingUrl = null;
        await createLink(target.url, target.alias, target.shortDomain);
      } else toast("Signed in successfully.");
    } catch (error) { note("form-message", error.message); }
    finally { button.disabled = false; }
  }
  async function createLink(url, alias, shortDomain = false) {
    const button = $("shorten-button"); button.disabled = true; note("shorten-message", "");
    try {
      if (!/^https:\/\//i.test(url)) throw new Error("Please enter a link starting with https://");
      const link = await api("/api/v1/links", { method: "POST", body: { destinationUrl: url, customAlias: alias || null, useShortDomain: shortDomain } });
      latestLink = link;
      $("result-url").textContent = link.shortUrl;
      $("result-url").href = link.shortUrl;
      $("result-destination").textContent = link.destinationUrl;
      show("latest-result", true);
      $("long-url").value = "";
      $("custom-alias").value = "";
      $("use-short-domain").checked = false;
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
    const alias = $("custom-alias").value.trim();
    if (alias && !/^[a-z0-9][a-z0-9-]{2,29}$/.test(alias)) { note("shorten-message", "Use 3–30 lowercase letters, numbers or hyphens for your custom name."); return; }
    const shortDomain = selectedShortDomain();
    if (!token) { pendingUrl = { url, alias, shortDomain }; openAuth(true); return; }
    createLink(url, alias, shortDomain);
  }
  function render() {
    $("total-links").textContent = String(links.length);
    $("total-clicks").textContent = links.reduce((sum, l) => sum + (l.clickCount || 0), 0).toLocaleString();
    $("links-list").replaceChildren();
    if (!links.length) {
      const empty = document.createElement("div"); empty.className = "empty-links";
      const heading = document.createElement("strong"); heading.textContent = "No links yet";
      const info = document.createElement("p"); info.textContent = "Paste a URL above to create your first short link.";
      empty.append(heading, info); $("links-list").append(empty); return;
    }
    for (const link of links) {
      const card = document.createElement("article"); card.className = "link-card";
      const body = document.createElement("div"); body.className = "link-core";
      const anchor = document.createElement("a"); anchor.href = link.shortUrl; anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.textContent = link.shortUrl;
      const target = document.createElement("p"); target.className = "destination"; target.textContent = link.destinationUrl;
      const meta = document.createElement("div"); meta.className = "link-meta";
      const visits = document.createElement("span"); visits.textContent = (link.clickCount || 0) + " visits";
      const created = document.createElement("span"); created.textContent = new Date(link.createdAt).toLocaleDateString();
      meta.append(visits, created); body.append(anchor, target, meta);
      const actions = document.createElement("div"); actions.className = "link-actions";
      function action(name, handler, extra = "") {
        const b = document.createElement("button"); b.type = "button"; b.textContent = name; b.className = extra; b.addEventListener("click", handler); actions.append(b);
      }
      action("Copy", () => copyLink(link.shortUrl));
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
    try { await navigator.clipboard.writeText(url); toast("Short link copied!"); }
    catch { toast("Copy unavailable. Select the link and copy it manually."); }
  }
  async function downloadQr(link) {
    try {
      const response = await api("/api/v1/links/" + encodeURIComponent(link.id) + "/qr");
      const blob = await response.blob(), url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "zrain-links-" + link.code + ".png";
      document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) { toast(error.message); }
  }
  document.querySelectorAll("[data-auth-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.authMode)));
  $("header-signin").addEventListener("click", () => openAuth(false));
  $("header-signout").addEventListener("click", () => { signout(); toast("Signed out."); });
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
  $("result-copy").addEventListener("click", () => { if (latestLink) copyLink(latestLink.shortUrl); });
  $("result-qr").addEventListener("click", () => { if (latestLink) downloadQr(latestLink); });
  setMode("signin");
  loadDomains();
})();