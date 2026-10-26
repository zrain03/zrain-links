import {formatMalaysiaTime} from "./time-format.js";

const $ = id => document.getElementById(id);
const API = "https://zrain-links.zrain-dev.workers.dev";
let auth, firebase, currentUser, nextUserToken = null, offset = 0, totalLinks = 0, allUsers = [], activeArea = "links", d1AccountsLoaded = false;
const note = (id, message) => { $(id).textContent = message; };
function el(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = String(content);
  if (className) node.className = className;
  return node;
}
function accountDate(iso) { return iso ? formatMalaysiaTime(iso) : "Not available"; }
async function adminApi(path, options = {}) {
  if (!currentUser) throw new Error("Please sign in as the administrator.");
  const headers = { Authorization: "Bearer " + await currentUser.getIdToken(), ...(options.body ? { "content-type": "application/json" } : {}) };
  const response = await fetch(API + path, {
    method: options.method || "GET", headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}), cache: "no-store"
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Request failed (" + response.status + ").");
  return result;
}
function makeEntry(title, paragraphs, buttonLabel, onDelete, protectedRow = false) {
  const item = el("article", undefined, "admin-entry");
  const info = el("div", undefined, "admin-entry-info");
  info.append(el("strong", title));
  for (const line of paragraphs) info.append(el("p", line));
  item.append(info);
  if (protectedRow) item.append(el("span", "Protected admin", "admin-protected"));
  else {
    const button = el("button", buttonLabel, "admin-danger");
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await onDelete(); } finally { button.disabled = false; }
    });
    item.append(button);
  }
  return item;
}
async function refreshOverview() {
  const data = await adminApi("/api/v1/admin/overview");
  $("metric-links").textContent = Number(data.totalLinks).toLocaleString("en-MY");
  $("metric-visits").textContent = Number(data.totalVisits).toLocaleString("en-MY");
  $("metric-users").textContent = Number(data.knownUsers).toLocaleString("en-MY");
}
async function loadLinks() {
  note("links-message", "Loading links…");
  const query = $("link-query").value.trim();
  try {
    const data = await adminApi("/api/v1/admin/links?offset=" + offset + "&q=" + encodeURIComponent(query));
    const list = $("admin-links-list");
    list.replaceChildren();
    totalLinks = data.total;
    for (const link of data.links) {
      const row = makeEntry(link.code, [
        link.destinationUrl, "Owner: " + link.ownerId,
        "Created: " + accountDate(link.createdAt) + "  ·  " + link.clickCount + " visits"
      ], "Delete link", async () => {
        const typed = window.prompt("Permanently delete this short link? Type the exact link name:\n" + link.code);
        if (typed === null) return;
        if (typed !== link.code) { note("links-message", "Deletion cancelled: link name did not match."); return; }
        try {
          await adminApi("/api/v1/admin/links/" + encodeURIComponent(link.id), { method: "DELETE", body: { confirm: typed } });
          note("links-message", "Link deleted. Its short URL no longer redirects.");
          await Promise.all([loadLinks(), refreshOverview()]);
        } catch (error) { note("links-message", error.message); }
      });
      list.append(row);
    }
    if (!data.links.length) list.append(el("p", "No links found."));
    $("links-page-label").textContent = totalLinks ? (offset + 1) + "–" + (offset + data.links.length) + " of " + totalLinks : "0 links";
    $("links-prev").disabled = offset === 0;
    $("links-next").disabled = offset + data.links.length >= totalLinks;
    note("links-message", "");
  } catch (error) { note("links-message", error.message); }
}
function drawUsers() {
  const list = $("admin-users-list");
  list.replaceChildren();
  for (const user of allUsers) {
    list.append(makeEntry(user.displayName || user.email || user.uid, [
      "Email: " + (user.email || "No email"), "UID: " + user.uid,
      "Created: " + accountDate(user.createdAt) + "  ·  Last sign-in: " + accountDate(user.lastLoginAt),
      "Links: " + user.linkCount + "  ·  " + (user.verified ? "Verified" : "Unverified")
    ], "Delete account", async () => {
      if (!user.email) { note("users-message", "Only accounts with an email can be deleted from this dashboard."); return; }
      const typed = window.prompt("Permanently delete the Firebase account and ALL its short links?\nType the exact account email:\n" + user.email);
      if (typed === null) return;
      if (typed !== user.email) { note("users-message", "Deletion cancelled: email did not match."); return; }
      try {
        await adminApi("/api/v1/admin/users/" + encodeURIComponent(user.uid), { method: "DELETE", body: { confirm: typed } });
        allUsers = allUsers.filter(u => u.uid !== user.uid);
        drawUsers();
        await refreshOverview();
        note("users-message", "Firebase account and its D1 links deleted.");
      } catch (error) { note("users-message", error.message); }
    }, user.isAdmin));
  }
  if (!allUsers.length) list.append(el("p", "No Firebase users found."));
  $("users-next").hidden = !nextUserToken;
}
async function loadUsers(reset = false) {
  if (reset) { allUsers = []; nextUserToken = null; }
  note("users-message", "Loading Firebase users…");
  try {
    const tokenQuery = !reset && nextUserToken ? "?pageToken=" + encodeURIComponent(nextUserToken) : "";
    const result = await adminApi("/api/v1/admin/users" + tokenQuery);
    allUsers.push(...result.users);
    nextUserToken = result.nextPageToken;
    drawUsers();
    note("users-message", "Showing " + allUsers.length + " Firebase account(s).");
  } catch (error) { note("users-message", error.message); }
}
async function loadD1Accounts() {
  note("d1-message", "Loading D1 records…");
  try {
    const data = await adminApi("/api/v1/admin/d1-accounts");
    const list = $("d1-accounts-list");
    list.replaceChildren();
    for (const account of data.accounts) {
      const row = makeEntry(account.uid, [
        "Created: " + accountDate(account.createdAt),
        "Links: " + account.linkCount + ". Purging also deletes this record's links."
      ], "Purge if deleted", async () => {
        const typed = window.prompt("Cleanup is only allowed if this user no longer exists in Firebase.\nType the exact UID:\n" + account.uid);
        if (typed === null) return;
        if (typed !== account.uid) { note("d1-message", "UID did not match."); return; }
        try {
          await adminApi("/api/v1/admin/d1-accounts/" + encodeURIComponent(account.uid), { method: "DELETE", body: {confirm:typed} });
          note("d1-message", "Orphaned D1 account and links removed.");
          await Promise.all([loadD1Accounts(), refreshOverview()]);
        } catch (error) { note("d1-message", error.message); }
      });
      list.append(row);
    }
    if (!data.accounts.length) list.append(el("p", "No Firebase-linked D1 records found."));
    d1AccountsLoaded = true;
    note("d1-message", "Showing up to 200 records. Only Firebase-deleted accounts may be purged.");
  } catch (error) { note("d1-message", error.message); }
}
function showArea(area) {
  activeArea = area;
  $("links-panel").hidden = area !== "links";
  $("users-panel").hidden = area !== "users";
  $("d1-panel").hidden = area !== "d1";
  $("tab-links").classList.toggle("active", area === "links");
  $("tab-users").classList.toggle("active", area === "users");
  $("tab-d1").classList.toggle("active", area === "d1");
  $("tab-links").setAttribute("aria-pressed", String(area === "links"));
  $("tab-users").setAttribute("aria-pressed", String(area === "users"));
  $("tab-d1").setAttribute("aria-pressed", String(area === "d1"));
}
async function initialize() {
  try {
    const response = await fetch("/__/firebase/init.json");
    if (!response.ok) throw new Error("Firebase Hosting configuration is unavailable.");
    const firebaseApp = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js");
    firebase = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js");
    auth = firebase.getAuth(firebaseApp.initializeApp(await response.json()));
    firebase.onAuthStateChanged(auth, async user => {
      currentUser = user;
      $("admin-content").hidden = true;
      $("sign-out").hidden = !user;
      if (!user) { note("admin-status", "Access restricted. Sign in using your authorized Google account on the main website."); return; }
      try {
        await adminApi("/api/v1/admin/me");
        $("admin-status").hidden = true;
        $("admin-content").hidden = false;
        await Promise.all([refreshOverview(), loadLinks()]);
      } catch (error) { note("admin-status", error.message); $("admin-status").hidden = false; }
    });
  } catch (error) { note("admin-status", error.message); }
}
$("tab-links").addEventListener("click", () => showArea("links"));
$("tab-users").addEventListener("click", () => { showArea("users"); if (!allUsers.length) loadUsers(true); });
$("tab-d1").addEventListener("click", () => { showArea("d1"); if (!d1AccountsLoaded) loadD1Accounts(); });
$("refresh-admin").addEventListener("click", () => { refreshOverview().catch(e => note("admin-status", e.message)); if (activeArea === "links") loadLinks(); else if (activeArea === "users") loadUsers(true); else loadD1Accounts(); });
$("admin-search-form").addEventListener("submit", e => { e.preventDefault(); offset = 0; loadLinks(); });
$("links-prev").addEventListener("click", () => { offset = Math.max(0, offset - 50); loadLinks(); });
$("links-next").addEventListener("click", () => { offset += 50; loadLinks(); });
$("users-next").addEventListener("click", () => loadUsers());
$("sign-out").addEventListener("click", async () => { if (auth) await firebase.signOut(auth); location.href = "/"; });
initialize();
