import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {activeSectionFromOffsets,sectionForHash,mountSectionNavigation} from "../public/link-section-nav.js";

const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("Visits is first, the mode selector separates workspaces, and collections follow the same order",async()=>{
  const html=await read("../public/index.html");
  const css=await read("../public/visits.css");
  const nav=html.slice(html.indexOf('<nav class="topnav"'),html.indexOf("</nav>"));
  assert.ok(nav.indexOf('href="#visits-links"')<nav.indexOf('href="#create"'));
  assert.match(nav,/id="nav-visits" class="current"/);
  const visits=html.indexOf('id="visits-links"'),switcher=html.indexOf('class="two-modes"'),direct=html.indexOf('id="create"');
  assert.ok(visits>=0 && visits<switcher && switcher<direct);
  const modes=html.slice(switcher,direct);
  assert.ok(modes.indexOf('href="#visits-links"')<modes.indexOf('href="#create"'));
  assert.ok(html.indexOf('class="visits-my-links"')<html.indexOf('class="direct-my-links"'));
  assert.match(html,/id="links-title"/);
  assert.match(html,/id="visits-list"/);
  assert.match(html,/id="links-list"/);
  assert.match(html,/src="\/link-section-nav\.js\?v=visits-first-20261027-1"/);
  assert.match(css,/\.direct-my-links\s*\{/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,"HTML IDs must remain unique");
});

test("active section follows scrolling, anchors and the visible collection",()=>{
  assert.equal(sectionForHash("#visits-destination"),"visits-links");
  assert.equal(sectionForHash("#long-url"),"create");
  assert.equal(sectionForHash("#my-links"),"my-links");
  assert.equal(activeSectionFromOffsets({directTop:400,collectionTop:900,collectionVisible:false},110),"visits-links");
  assert.equal(activeSectionFromOffsets({directTop:40,collectionTop:900,collectionVisible:false},110),"create");
  assert.equal(activeSectionFromOffsets({directTop:-100,collectionTop:40,collectionVisible:true},110),"my-links");
});

test("navigation and switch highlights update on click and scroll",()=>{
  const controls={};
  function anchor(href,mode=false){
    const attrs=new Map([["href",href]]);
    const classes=new Set();
    const callbacks={};
    const item={
      href,classes,callbacks,
      getAttribute:k=>attrs.get(k),
      setAttribute:(k,v)=>attrs.set(k,v),
      removeAttribute:k=>attrs.delete(k),
      classList:{toggle:(name,enable)=>enable?classes.add(name):classes.delete(name)},
      closest:selector=>mode&&selector===".mode-choices"?{}:null,
      addEventListener:(type,cb)=>{callbacks[type]=cb;}
    };
    return item;
  }
  const navVisits=anchor("#visits-links"),navDirect=anchor("#create"),navMy=anchor("#my-links");
  const modeVisits=anchor("#visits-links",true),modeDirect=anchor("#create",true);
  let directTop=440,collectionTop=1000;
  const section={hidden:false,getBoundingClientRect:()=>({top:collectionTop})};
  const doc={
    querySelector:()=>({getBoundingClientRect:()=>({height:75})}),
    getElementById:id=>id==="create"?{getBoundingClientRect:()=>({top:directTop})}:id==="my-links"?section:null,
    querySelectorAll:selector=>selector.startsWith(".topnav")?[navVisits,navDirect,navMy]:[modeVisits,modeDirect]
  };
  const win={location:{hash:""},addEventListener:(type,cb)=>{controls[type]=cb;},requestAnimationFrame:cb=>cb()};
  mountSectionNavigation(doc,win);
  assert.ok(navVisits.classes.has("current") && modeVisits.classes.has("selected"));
  navDirect.callbacks.click();
  assert.ok(navDirect.classes.has("current") && modeDirect.classes.has("selected"));
  directTop=35;
  controls.scroll();
  assert.ok(navDirect.classes.has("current") && !navVisits.classes.has("current"));
  collectionTop=30;
  controls.scroll();
  assert.ok(navMy.classes.has("current"));
  assert.ok(!modeVisits.classes.has("selected") && !modeDirect.classes.has("selected"));
  section.hidden=true;
  controls.scroll();
  assert.ok(navDirect.classes.has("current"));
});
