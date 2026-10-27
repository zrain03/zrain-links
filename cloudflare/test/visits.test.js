import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {ACTION_CATALOG, ACTION_LABELS, validateVisitsTitle, createVisitsAlias, randomVisitsAlias, validateVisitsActions, validateAcknowledgements} from "../src/visits-core.js";

const read = path => readFile(new URL(path,import.meta.url),"utf8");
test("Visit a page is prominently supported but not a required action type",()=>{
  assert.equal(ACTION_CATALOG[0].id,"visit_page");
  assert.ok(ACTION_CATALOG.length>=20 && ACTION_CATALOG.length<=30);
  const allowed=new Set(["Website","YouTube","Instagram","TikTok","X / Twitter","Facebook","Reddit","LinkedIn","Pinterest","Snapchat","Threads"]);
  assert.ok(ACTION_CATALOG.every(action=>allowed.has(action.platform)));
  assert.equal(ACTION_CATALOG.filter(action=>action.platform==="Website").length,1);
  assert.ok(!ACTION_CATALOG.some(action=>["GitHub","Spotify","Roblox","Discord","Telegram","Google Play Store"].includes(action.platform)));
  assert.equal(ACTION_LABELS.get("github_star").label,"Star repository"); // old published links remain readable
  assert.throws(()=>validateVisitsActions([{type:"github_star",url:"https://github.com/zrain03/zrain-links"}]));
  const youtube=validateVisitsActions([{type:"youtube_subscribe",url:"https://www.youtube.com/@example"}]);
  assert.equal(youtube[0].platform,"YouTube");
  const page=validateVisitsActions([{type:"visit_page",url:"https://example.org/resource"}]);
  assert.equal(page[0].type,"visit_page");
});
test("rejects invalid action URLs, private destinations, and spoofed platform domains",()=>{
  for(const actions of [
    [],Array.from({length:21},()=>({type:"visit_page",url:"https://example.org"})),
    [{type:"fake",url:"https://example.org"}],
    [{type:"visit_page",url:"http://example.org"}],
    [{type:"visit_page",url:"https://localhost"}],
    [{type:"spotify_follow",url:"https://open.spotify.com/artist/one"}],
    [{type:"youtube_subscribe",url:"https://www.youtube.com.evil.org"}]
  ])assert.throws(()=>validateVisitsActions(actions));
});
test("separate link names and acknowledgements are validated",()=>{
  assert.equal(validateVisitsTitle(" My launch "),"My launch");
  assert.equal(createVisitsAlias("Guess The Flag",""),"guess-the-flag");
  assert.throws(()=>createVisitsAlias("admin"));
  assert.equal(createVisitsAlias("claim mp"),"claim-mp");
  assert.match(randomVisitsAlias(),/^[a-z0-9]{9}$/);
  assert.throws(()=>validateVisitsTitle("x"));
  assert.equal(validateAcknowledgements([1,0],2),true);
  for(const completed of [[0],[0,0],[0,1,2],[2,1]])assert.throws(()=>validateAcknowledgements(completed,2));
});
test("database migration reserves one name across both Direct Links and Visits Links",async()=>{
  const sql=await read("../migrations/0003_visits_links.sql");
  assert.match(sql,/CREATE TABLE IF NOT EXISTS visits_links/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS visits_actions/);
  assert.match(sql,/INSERT OR IGNORE INTO link_names/);
  for(const trigger of ["direct_names_insert","direct_names_delete","visits_names_insert","visits_names_delete"])assert.ok(sql.includes(trigger));
  assert.match(sql,/REFERENCES users\(id\) ON DELETE CASCADE/);
});
test("independent Visits Link APIs and public unlock do not break direct redirects",async()=>{
  const [worker,visits,html,builder,visitor,admin]=await Promise.all([
    read("../src/index.js"),read("../src/visits.js"),read("../public/index.html"),
    read("../public/visits-ui.js"),read("../public/visit-page.js"),read("../src/admin.js")
  ]);
  assert.match(worker,/handleVisits\(request, db, \{authUser,readBody,throttle,now,id\}\)/);
  assert.match(worker,/SELECT code_lower FROM link_names WHERE code_lower/);
  assert.match(worker,/PUBLIC_LINK_ORIGIN\+"\/visit\.html\?code="/);
  assert.match(visits,/await authUser\(request,db\)/);
  assert.match(visits,/validateAcknowledgements\(body\?\.completed,actions\.length\)/);
  assert.match(visits,/view_count = view_count \+ 1/);
  assert.match(visits,/unlock_count = unlock_count \+ 1/);
  assert.match(visits,/rowToPublic/);
  assert.match(html,/id="visits-form"/);
  assert.match(html,/id="visits-auto-shorten"/);
  assert.match(html,/id="visits-preview-url"/);
  assert.doesNotMatch(html,/id="visits-alias"/);
  assert.match(builder,/autoShorten:automatic/);
  assert.match(builder,/\$\("visits-preview-url"\)/);
  assert.doesNotMatch(builder,/\$\("visits-alias"\)/);
  assert.match(visits,/randomVisitsAlias\(\)/);
  assert.match(visits,/createVisitsAlias\(title\)/);
  assert.match(visits,/if \(body\?\.customAlias != null\)/);
  assert.match(html,/id="visits-add-page"/);
  assert.match(html,/id="visits-picker"/);
  assert.match(html,/id="visits-list"/);
  assert.match(builder,/visits_add_page|visits-add-page/);
  assert.match(visitor,/completed\.size===actions\.length/);
  assert.match(admin,/FROM visits_links/);
  assert.match(admin,/DELETE FROM visits_links WHERE owner_id/);
});
