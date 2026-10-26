export const RESERVED = new Set(["api","r","admin","login","logout","signup","signin","register","assets","static","docs","swagger-ui","actuator","index","index.html","favicon.svg","app.css","app.js","help","terms","privacy","dashboard","links","my-links","account","settings","support"]);

export function validateAlias(value) {
  if (typeof value !== "string") throw new Error("Invalid custom link name.");
  const alias = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(alias) || alias.endsWith("-") || RESERVED.has(alias))
    throw new Error("Use 3–30 lowercase letters, numbers or hyphens. Choose a different name.");
  return alias;
}

export function validateDestination(input) {
  if (typeof input !== "string" || !input || input.length > 2048) throw new Error("Enter a valid public HTTPS URL.");
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a valid public HTTPS URL."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !host || url.username || url.password || url.hash || (url.port && url.port !== "443") ||
      host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") ||
      host.endsWith(".test") || host.endsWith(".example") || host.endsWith(".invalid") ||
      host.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes("."))
    throw new Error("Use a public HTTPS destination, not a local/private address.");
  return url.href;
}

export function getCode() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}

export function publicOrigin(requestUrl, configured) {
  const url = new URL(requestUrl);
  if (configured) {
    const origin = new URL(configured);
    if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username)
      throw new Error("PUBLIC_BASE_URL must be an HTTPS origin without a path.");
    return origin.origin;
  }
  if (url.protocol === "https:" && url.hostname.endsWith(".workers.dev")) return url.origin;
  if (["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
  throw new Error("PUBLIC_BASE_URL must be configured for custom domains.");
}
