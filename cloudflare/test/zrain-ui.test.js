import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mountZrainUI,ZRAIN_HOME,ZRAIN_TAGLINE} from "../public/zrain-ui.js";

function makeNode(tag){
  return {
    tagName:tag,children:[],attrs:{},textContent:"",className:"",
    setAttribute(name,value){this.attrs[name]=value},
    replaceChildren(...nodes){this.children=nodes},
    append(...nodes){this.children.push(...nodes)}
  };
}
test("Zrain UI sends logo and Zrain credit to the main ecosystem without changing navigation",()=>{
  const brand=makeNode("div"),footer=makeNode("div"),nav=makeNode("nav");
  nav.append(makeNode("a"));
  const doc={
    createElement:makeNode,
    querySelector(selector){
      if(selector===".zrain-header .zrain-brand")return brand;
      if(selector===".zrain-footer .zrain-footer__identity")return footer;
      if(selector.includes(".topnav"))return nav;
      return null;
    }
  };
  const result=mountZrainUI({product:"Links",logoSrc:"/zrain-logo.webp",productHref:"/",document:doc});
  assert.equal(ZRAIN_HOME,"https://zrain.web.app");
  assert.equal(ZRAIN_TAGLINE,"Made for people. Built with purpose.");
  assert.equal(result.homeHref,ZRAIN_HOME);
  assert.equal(brand.children[0].href,ZRAIN_HOME);
  assert.equal(brand.children[0].children[1].textContent,"Zrain");
  assert.equal(brand.children[0].children.length,2,"Header shows logo and brand only");
  assert.equal(brand.children[1].textContent,"Links");
  assert.equal(brand.children[1].href,"/");
  assert.equal(footer.children[0].href,ZRAIN_HOME);
  assert.equal(footer.children[0].children[1].children[0].textContent,"Developed by Zrain");
  assert.equal(footer.children[0].children[1].children[1].textContent,ZRAIN_TAGLINE);
  assert.equal(nav.children.length,1,"Existing auth-driven navigation must not be replaced");
});
test("both Links website pages link branding to Zrain ecosystem with static fallback",async()=>{
  for(const path of ["../public/index.html","../public/admin.html"]){
    const html=await readFile(new URL(path,import.meta.url),"utf8");
    assert.match(html,/class="zrain-brand__home" href="https:\/\/zrain\.web\.app"/);
    assert.match(html,/class="zrain-footer__home" href="https:\/\/zrain\.web\.app"/);
    assert.match(html,/Made for people\. Built with purpose\./);
    assert.match(html,/zrain-ui-config\.js/);
    assert.match(html,/zrain-brand__product"/);
  }
});
