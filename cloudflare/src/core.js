export const RESERVED = new Set(["api","r","admin","login","logout","signup","signin","register","assets","static","docs","swagger-ui","actuator","index","index.html","favicon.svg","app.css","app.js","help","terms","privacy","dashboard","links","my-links","account","settings","support","robots.txt","sitemap.xml"]);
export function validateAlias(value) {
  if (typeof value !== "string") throw new Error("Invalid custom name.");
  const alias = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(alias) || alias.endsWith("-") || RESERVED.has(alias))
    throw new Error("Use 3–30 lowercase letters, numbers or hyphens; choose a different name.");
  return alias;
}
export function validateDestination(input) {
  if (typeof input !== "string" || input.length > 2048 || input.trim().length === 0) throw new Error("Enter a public HTTPS URL.");
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a valid HTTPS URL."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !host || url.username || url.password ||
    (url.port && url.port !== "443") || host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".invalid") ||
    host.endsWith(".test") || host.endsWith(".example") || host.startsWith("[") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes("."))
    throw new Error("Use a public HTTPS website, not a private or local address.");
  return url.href;
}
export function randomAlias() {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}
export function getOrigin(request, configured) {
  if (configured?.trim()) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password)
      throw new Error("PUBLIC_BASE_URL must be an HTTPS origin, without any path.");
    return parsed.origin;
  }
  const url = new URL(request.url);
  if (url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
  throw new Error("Invalid public hostname.");
}
