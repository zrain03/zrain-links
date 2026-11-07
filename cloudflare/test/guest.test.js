/**
 * Fail / File: cloudflare/test/guest.test.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created: 2026-11-07
 * Dikemas kini / Last updated: 2026-11-07
 * BM: Ujian pengasingan token Guest daripada autentikasi akaun dan fungsi lama.
 * EN: Verify guest credentials stay separate from account authentication.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createGuest,linkOwner} from "../src/guest.js";

test("guest registration uses a synthetic owner and stores only a hashed credential",async()=>{
  const batches=[];
  const db={prepare(sql){return {bind(...args){return {sql,args}}}},async batch(ops){batches.push(ops)}};
  const credential="a".repeat(64);
  const result=await createGuest(db,{id:()=>"123",now:()=>1794030000,token:()=>credential,hash:async x=>"hash:"+x});
  assert.equal(result.guestKey,credential);
  assert.equal(batches.length,1);
  assert.equal(batches[0].length,2);
  assert.equal(batches[0][0].args[0],"guest:123");
  assert.equal(batches[0][1].args[0],"hash:"+credential);
  assert.ok(!JSON.stringify(batches).includes('"'+credential+'"'));
});

test("guest key gives only a matching link-owner identity",async()=>{
  const credential="b".repeat(64);let queried=false;
  const db={prepare(sql){queried=true;assert.match(sql,/FROM guest_credentials JOIN users/);return {bind(digest){
    assert.equal(digest,"hash:"+credential);return {first:async()=>({id:"guest:123"})};
  }}}};
  const request=new Request("https://example.org",{headers:{"X-Guest-Key":credential}});
  const owner=await linkOwner(request,db,{authUser:async()=>{throw Error("Firebase auth was called")},hash:async x=>"hash:"+x});
  assert.deepEqual(owner,{id:"guest:123",guest:true});
  assert.equal(queried,true);
});

test("guests cannot skip key validation and signed-in identity wins",async()=>{
  let queries=0;
  const db={prepare(){queries++;return {bind(){return {first:async()=>null}}}}};
  const deps={authUser:async()=>({id:"firebase:verified"}),hash:async x=>x};
  await assert.rejects(()=>linkOwner(new Request("https://example.org"),db,deps),e=>e.status===401);
  await assert.rejects(()=>linkOwner(new Request("https://example.org",{headers:{"X-Guest-Key":"bad"}}),db,deps),e=>e.status===401);
  const owner=await linkOwner(new Request("https://example.org",{headers:{"Authorization":"Bearer valid","X-Guest-Key":"a".repeat(64)}}),db,deps);
  assert.equal(owner.id,"firebase:verified");
  assert.equal(queries,0);
});

test("only creation and QR endpoints accept guest ownership; account and delete stay protected",async()=>{
  const worker=await readFile(new URL("../src/index.js",import.meta.url),"utf8");
  const visits=await readFile(new URL("../src/visits.js",import.meta.url),"utf8");
  const app=await readFile(new URL("../public/app.js",import.meta.url),"utf8");
  const builder=await readFile(new URL("../public/visits-ui.js",import.meta.url),"utf8");
  assert.match(worker,/path === "\/api\/v1\/guest"/);
  assert.match(worker,/const user = await linkOwner\(request,db\)/);
  assert.match(worker,/const user = await authUser\(request,db\)/);
  assert.match(visits,/const user=await linkOwner\(request,db\)/);
  assert.match(visits,/await authUser\(request,db\)/);
  assert.match(app,/guest:asGuest/);
  assert.doesNotMatch(app,/if \(!currentUser\) \{ pendingUrl = \{ url, alias \}/);
  assert.match(builder,/guest:asGuest/);
  assert.doesNotMatch(builder,/Sign in to publish\. Your form is kept here/);
});

test("migration adds guest credentials without modifying original owner tables",async()=>{
  const sql=await readFile(new URL("../migrations/0004_guest_credentials.sql",import.meta.url),"utf8");
  assert.match(sql,/CREATE TABLE IF NOT EXISTS guest_credentials/);
  assert.match(sql,/REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.doesNotMatch(sql,/ALTER TABLE|DROP TABLE/i);
});
