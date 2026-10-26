// Pure, browser-and-Node-compatible suggestions. The API remains the final
// authority for collisions and reserved paths.
const RESERVED = new Set(["api","r","admin","login","logout","signup","signin","register",
  "assets","static","docs","swagger-ui","actuator","index","index.html",
  "favicon.svg","app.css","app.js","help","terms","privacy","dashboard",
  "links","my-links","account","settings","support","robots.txt","sitemap.xml"]);
const VALID = /^[a-z0-9][a-z0-9-]{2,29}$/;

export function isValidAlias(value) {
  return typeof value === "string" && VALID.test(value) &&
    !value.endsWith("-") && !RESERVED.has(value);
}

export function aliasSuggestions(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  const words = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase().match(/[a-z0-9]+/g) || [];
  const candidates = [words.join("-"), words.join("")];
  const results = [];
  for (const candidate of candidates) {
    const suggestion = candidate.slice(0, 30).replace(/-+$/, "");
    if (isValidAlias(suggestion) && !results.includes(suggestion)) results.push(suggestion);
  }
  return results;
}
