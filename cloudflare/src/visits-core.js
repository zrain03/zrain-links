import { validateDestination, randomAlias } from "./core.js";

const ALL_ACTION_CATALOG = Object.freeze([
  ["visit_page","Website","Visit a page",[]],
  ["youtube_subscribe","YouTube","Subscribe to channel",["youtube.com"]],
  ["youtube_notifications","YouTube","Turn on channel notifications",["youtube.com"]],
  ["youtube_like","YouTube","Like a video",["youtube.com","youtu.be"]],
  ["youtube_comment","YouTube","Comment on a video",["youtube.com","youtu.be"]],
  ["youtube_watch","YouTube","Watch a video",["youtube.com","youtu.be"]],
  ["instagram_follow","Instagram","Follow user",["instagram.com"]],
  ["instagram_like","Instagram","Like a post",["instagram.com"]],
  ["instagram_comment","Instagram","Comment on a post",["instagram.com"]],
  ["tiktok_follow","TikTok","Follow user",["tiktok.com"]],
  ["tiktok_like","TikTok","Like a post",["tiktok.com"]],
  ["tiktok_comment","TikTok","Comment on a post",["tiktok.com"]],
  ["x_follow","X / Twitter","Follow user",["x.com","twitter.com"]],
  ["x_like","X / Twitter","Like a post",["x.com","twitter.com"]],
  ["x_repost","X / Twitter","Repost",["x.com","twitter.com"]],
  ["discord_join","Discord","Join server",["discord.gg","discord.com"]],
  ["telegram_join","Telegram","Join channel",["t.me","telegram.me"]],
  ["spotify_follow","Spotify","Follow artist",["open.spotify.com"]],
  ["spotify_like","Spotify","Save a song",["open.spotify.com"]],
  ["twitch_follow","Twitch","Follow streamer",["twitch.tv"]],
  ["facebook_follow","Facebook","Follow page",["facebook.com","fb.com"]],
  ["facebook_like","Facebook","Like a post",["facebook.com","fb.com"]],
  ["facebook_share","Facebook","Share a post",["facebook.com","fb.com"]],
  ["github_follow","GitHub","Follow user",["github.com"]],
  ["github_star","GitHub","Star repository",["github.com"]],
  ["play_store_install","Google Play Store","Install app",["play.google.com"]],
  ["app_store_install","Apple App Store","Install app",["apps.apple.com"]],
  ["reddit_join","Reddit","Join community",["reddit.com"]],
  ["reddit_upvote","Reddit","Upvote post",["reddit.com"]],
  ["linkedin_follow","LinkedIn","Follow company",["linkedin.com"]],
  ["linkedin_connect","LinkedIn","Connect",["linkedin.com"]],
  ["pinterest_follow","Pinterest","Follow user",["pinterest.com"]],
  ["snapchat_add","Snapchat","Add user",["snapchat.com"]],
  ["whatsapp_join","WhatsApp","Join group",["chat.whatsapp.com"]],
  ["soundcloud_follow","SoundCloud","Follow artist",["soundcloud.com"]],
  ["soundcloud_like","SoundCloud","Like track",["soundcloud.com"]],
  ["steam_follow","Steam","Follow curator",["store.steampowered.com","steamcommunity.com"]],
  ["roblox_follow","Roblox","Follow user",["roblox.com"]],
  ["producthunt_upvote","Product Hunt","Upvote product",["producthunt.com"]],
  ["threads_follow","Threads","Follow user",["threads.net"]],
  ["kick_follow","Kick","Follow streamer",["kick.com"]],
  ["vimeo_follow","Vimeo","Follow creator",["vimeo.com"]],
  ["bandcamp_follow","Bandcamp","Follow artist",["bandcamp.com"]],
  ["deezer_follow","Deezer","Follow artist",["deezer.com"]],
  ["rumble_subscribe","Rumble","Subscribe to channel",["rumble.com"]],
  ["dribbble_follow","Dribbble","Follow designer",["dribbble.com"]],
  ["behance_follow","Behance","Follow user",["behance.net"]],
  ["deviantart_watch","DeviantArt","Watch artist",["deviantart.com"]],
  ["audiomack_follow","Audiomack","Follow artist",["audiomack.com"]]
].map(([id,platform,label,hosts])=>({id,platform,label,hosts})));

const SOCIAL_PLATFORMS = new Set([
  "YouTube","Instagram","TikTok","X / Twitter","Facebook",
  "Reddit","LinkedIn","Pinterest","Snapchat","Threads"
]);
// The public catalog only exposes Visit a page and social-media actions.
// Historical links keep their original action labels and remain usable.
export const ACTION_CATALOG = Object.freeze(ALL_ACTION_CATALOG.filter(
  action => action.id === "visit_page" || SOCIAL_PLATFORMS.has(action.platform)
));
export const ACTION_LABELS = new Map(ALL_ACTION_CATALOG.map(action => [action.id, action]));
const byId = new Map(ACTION_CATALOG.map(action => [action.id, action]));
export function validateVisitsTitle(input) {
  if (typeof input !== "string" || input.trim().length < 3 || input.trim().length > 90)
    throw new Error("Enter a link title between 3 and 90 characters.");
  return input.trim();
}
const VISITS_SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
export function createVisitsAlias(title) {
  // Reserve 5 of the 30 allowed characters for "-" plus a 4-letter suffix.
  const derived = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"").slice(0,25).replace(/-+$/,"");
  if (!/^[a-z0-9][a-z0-9-]{2,24}$/.test(derived) || derived.endsWith("-"))
    throw new Error("Use a title with at least 3 URL-safe letters or numbers, or enable automatic shortening.");
  return derived;
}
export function titleVisitsAlias(title) {
  const prefix = createVisitsAlias(title);
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(bytes, byte => VISITS_SUFFIX_ALPHABET[byte % VISITS_SUFFIX_ALPHABET.length]).join("");
  return prefix + "-" + suffix;
}
export function randomVisitsAlias() {
  // Shortening enabled: use an independent short code, without title prefix.
  return randomAlias().toLowerCase();
}
export function validateVisitsActions(actions) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > 20)
    throw new Error("Choose between 1 and 20 actions to publish a Visits Link.");
  return actions.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.type !== "string")
      throw new Error("Choose a supported action.");
    const action = byId.get(input.type);
    if (!action) throw new Error("Unsupported action: " + input.type);
    const url = validateDestination(input.url);
    const host = new URL(url).hostname.toLowerCase();
    if (action.hosts.length && !action.hosts.some(allowed => host === allowed || host.endsWith("." + allowed)))
      throw new Error(action.platform + " actions must link to an official " + action.platform + " page.");
    return { type:action.id, platform:action.platform, label:action.label, url };
  });
}
export function validateAcknowledgements(positions, actionCount) {
  if (!Number.isInteger(actionCount) || actionCount < 1 || actionCount > 20 ||
      !Array.isArray(positions) || positions.length !== actionCount ||
      new Set(positions).size !== actionCount ||
      !positions.every(x=>Number.isInteger(x) && x>=0 && x<actionCount))
    throw new Error("Acknowledge every action before unlocking.");
  return true;
}
