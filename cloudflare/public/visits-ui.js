import {formatMalaysiaTime} from "./time-format.js?v=myt-seconds-20261026-2";
import {openQrPreview} from "./qr-preview.js?v=qr-preview-20261027-1";


const $ = id => document.getElementById(id);
const API = "https://zrain-links.zrain-dev.workers.dev";
const PUBLIC = "https://zrain-links.web.app/";
const catalog = [];
const actions = [];
const DRAFT_KEY="zrain-links:visits-draft";
let saved=[],selectedCategory="All",latest=null;
const categories=["All","Visit a page","YouTube","Instagram","TikTok","Facebook","X / Twitter","More social"];
const majorSocial=new Set(["YouTube","Instagram","TikTok","Facebook","X / Twitter"]);
const categoryOf = action => action.id==="visit_page" ? "Visit a page" :
  majorSocial.has(action.platform) ? action.platform : "More social";
function node(tag,txt,className){
  const e=document.createElement(tag);
  if(txt!==undefined)e.textContent=txt;
  if(className)e.className=className;
  return e;
}
function message(id,text,ok=false){
  const el=$(id);el.textContent=text;el.classList.toggle("ok",ok);
}
async function api(path,{method="GET",body=null,auth=false}={}){
  const headers={};
  if(body!==null)headers["content-type"]="application/json";
  if(auth){
    const user=window.ZrainVisitsBridge?.getUser();
    if(!user)throw new Error("Sign in and verify your email first.");
    headers.Authorization="Bearer "+await user.getIdToken();
  }
  const res=await fetch(API+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store"});
  const result=res.status===204?null:await res.json().catch(()=>null);
  if(!res.ok){const error=new Error(result?.message||"Request failed ("+res.status+").");error.status=res.status;throw error;}
  return result;
}
function preview(){
  const title=$("visits-title").value.trim();
  const automatic=$("visits-auto-shorten").checked;
  const derived=slug(title);
  $("visits-preview-title").textContent=title||"Your link title";
  const link=$("visits-preview-url"),note=$("visits-preview-link-note");
  if (automatic) {
    link.textContent="zrain-links.web.app/•••••••••";
    note.textContent="A random short link will be generated when you publish. The name cannot be edited.";
  } else if (!title) {
    link.textContent="zrain-links.web.app/your-title";
    note.textContent="Your title becomes the link name with a random four-letter suffix.";
  } else if (isValidVisitsPrefix(derived)) {
    link.textContent=boundLink(derived+"-XXXX");
    note.textContent="A different four-letter suffix is added when you publish, keeping your title in the URL.";
  } else {
    link.textContent="zrain-links.web.app/…";
    note.textContent="Choose a title that produces at least 3 URL-safe letters or numbers, or enable shortening.";
  }
  const root=$("visits-preview-steps");root.replaceChildren();
  if(!actions.length){root.append(node("p","Choose an action to preview the visitor journey."));return}
  for(let i=0;i<actions.length;i++){
    const a=actions[i];root.append(node("div",(i+1)+". "+a.label+" · "+a.platform,"preview-action"));
  }
}
function drawActions(){
  const root=$("visits-action-rows");root.replaceChildren();
  actions.forEach((action,index)=>{
    const row=node("div",undefined,"visits-action-row");
    const title=node("div");
    title.append(node("strong",(index+1)+". "+action.label),node("small",action.platform));
    const field=node("input");field.type="url";field.value=action.url;field.placeholder=action.id==="visit_page"?"https://example.com/page":"Paste official action URL";
    field.required=true;field.maxLength=2048;field.setAttribute("aria-label",action.label+" URL");
    field.addEventListener("input",()=>{action.url=field.value.trim()});
    const controls=node("div",undefined,"visits-row-controls");
    const up=node("button","↑");up.type="button";up.disabled=index===0;up.setAttribute("aria-label","Move action up");
    up.addEventListener("click",()=>{[actions[index-1],actions[index]]=[actions[index],actions[index-1]];drawActions()});
    const down=node("button","↓");down.type="button";down.disabled=index===actions.length-1;down.setAttribute("aria-label","Move action down");
    down.addEventListener("click",()=>{[actions[index+1],actions[index]]=[actions[index],actions[index+1]];drawActions()});
    const remove=node("button","×");remove.type="button";remove.setAttribute("aria-label","Remove "+action.label);
    remove.addEventListener("click",()=>{actions.splice(index,1);drawActions()});
    controls.append(up,down,remove);
    row.append(title,field,controls);root.append(row);
  });
  $("visits-add-action").disabled=actions.length>=20;
  $("visits-add-page").disabled=actions.length>=20;
  preview();
}
function addAction(item){
  if(actions.length>=20){message("visits-message","Maximum 20 actions per link.");return}
  actions.push({id:item.id,platform:item.platform,label:item.label,url:""});
  drawActions();
  if($("visits-picker").open)$("visits-picker").close();
  const last=$("visits-action-rows").lastElementChild?.querySelector("input");
  last?.focus();
}
function renderCatalog(){
  const root=$("visits-picker-options");root.replaceChildren();
  const search=$("visits-search").value.trim().toLowerCase();
  const filtered=catalog.filter(a=>(selectedCategory==="All"||categoryOf(a)===selectedCategory) &&
    (a.platform+" "+a.label+" "+a.id).toLowerCase().includes(search));
  const groups=new Map();
  // Visit a page is always featured first in the action catalog.
  for(const action of filtered){
    const group=action.id==="visit_page"?"Featured · Visit a page":action.platform;
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(action);
  }
  if(!filtered.length)root.append(node("p","No actions found. Try another search."));
  for(const [platform,items] of groups){
    const section=node("section"),heading=node("h3",platform),grid=node("div",undefined,"visits-picker-grid");
    items.forEach(action=>{
      const b=node("button",action.id==="visit_page"?"↗ Visit a page":action.label);b.type="button";
      b.addEventListener("click",()=>addAction(action));grid.append(b);
    });
    section.append(heading,grid);root.append(section);
  }
}
function renderTabs(){
  const root=$("visits-picker-tabs");root.replaceChildren();
  for(const group of categories){
    const b=node("button",group,selectedCategory===group?"active":"");b.type="button";
    b.setAttribute("aria-pressed",String(selectedCategory===group));
    b.addEventListener("click",()=>{selectedCategory=group;renderTabs();renderCatalog()});
    root.append(b);
  }
}
async function openPicker(){
  if(actions.length>=20){message("visits-message","Maximum 20 actions.");return;}
  if(!catalog.length){
    try{
      catalog.push(...await api("/api/v1/visits/catalog"));
    }catch(error){message("visits-message",error.message);return}
  }
  selectedCategory="All";$("visits-search").value="";renderTabs();renderCatalog();
  $("visits-picker").showModal();$("visits-search").focus();
}
function slug(text){
  return text.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,25).replace(/-+$/,"");
}
function isValidVisitsPrefix(name){
  return /^[a-z0-9][a-z0-9-]{2,24}$/.test(name) && !name.endsWith("-");
}
function boundLink(code){return PUBLIC+encodeURIComponent(code)}
async function submit(event){
  event.preventDefault();
  message("visits-message","");
  const destination=$("visits-destination").value.trim(),title=$("visits-title").value.trim();
  const automatic=$("visits-auto-shorten").checked;
  const name=slug(title);
  if(!destination.startsWith("https://")){message("visits-message","Use a public HTTPS destination.");return}
  if(title.length<3||title.length>90){message("visits-message","Use a title with 3–90 characters.");return}
  if(!automatic&&!isValidVisitsPrefix(name)){
    message("visits-message","This title cannot form a valid public link. Change the title or enable automatic shortening.");return;
  }
  if(!actions.length){message("visits-message","Choose at least one action. Visit a page is optional.");return}
  if(actions.some(a=>!a.url)){message("visits-message","Enter a URL for every selected action.");return}
  if(!window.ZrainVisitsBridge?.getUser()){
    try { sessionStorage.setItem(DRAFT_KEY,JSON.stringify({destination,title,automatic,actions})); }
    catch { /* Session storage may be unavailable in private browsing. */ }
    message("visits-message","Sign in to publish. Your form is kept here, so you can submit it afterward.");
    window.ZrainVisitsBridge?.openAuth();
    return;
  }
  const button=$("visits-submit");button.disabled=true;
  try{
    latest=await api("/api/v1/visits",{method:"POST",auth:true,body:{
      destinationUrl:destination,title,autoShorten:automatic,
      actions:actions.map(a=>({type:a.id,url:a.url}))
    }});
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    const href=boundLink(latest.code);$("visits-result-url").href=href;$("visits-result-url").textContent=href;
    $("visits-preview-url").textContent=href;
    $("visits-preview-link-note").textContent="Published public link. This address cannot be edited.";
    $("visits-result").hidden=false;
    $("visits-result").scrollIntoView({behavior:"smooth",block:"center"});
    message("visits-message","Visits Link published! Visitor actions are acknowledged, not platform-verified.",true);
    await refreshList();
  }catch(error){message("visits-message",error.message)}
  finally{button.disabled=false}
}
async function copy(href){
  try{await navigator.clipboard.writeText(href);message("visits-list-message","Link copied.",true);}
  catch{window.prompt("Copy this link:",href)}
}
function showQr(link){
  return openQrPreview({
    fetchQr:()=>window.ZrainVisitsBridge.api("/api/v1/visits/"+encodeURIComponent(link.id)+"/qr"),
    shortUrl:boundLink(link.code),
    fileName:"zrain-visits-"+link.code+".svg"
  });
}
function showList(){
  $("visits-count").textContent=String(saved.length);
  $("visits-unlocks").textContent=saved.reduce((acc,link)=>acc+Number(link.unlocks||0),0).toLocaleString();
  const root=$("visits-list");root.replaceChildren();
  if(!saved.length){root.append(node("div","No Visits Links yet. Create one above.","empty-links"));return}
  saved.forEach(link=>{
    const card=node("article",undefined,"link-card"),core=node("div",undefined,"link-core");
    const a=node("a",boundLink(link.code));a.href=boundLink(link.code);a.target="_blank";a.rel="noopener noreferrer";
    const title=node("p",link.title,"destination"),meta=node("div",undefined,"link-meta");
    meta.append(node("span",link.views+" views"),node("span",link.unlocks+" unlocks"),node("span",formatMalaysiaTime(link.createdAt)));
    core.append(a,title,meta);
    const bar=node("div",undefined,"link-actions");
    const button=(label,handler,extra="")=>{const b=node("button",label,extra);b.type="button";b.addEventListener("click",handler);bar.append(b)};
    button("Copy",()=>copy(boundLink(link.code)));
    button("QR code",()=>showQr(link));
    button("Delete",async()=>{
      if(!window.confirm("Delete this Visits Link? Its unlock page and statistics will be removed permanently."))return;
      try{await api("/api/v1/visits/"+encodeURIComponent(link.id),{method:"DELETE",auth:true});
        await refreshList();message("visits-list-message","Visits Link deleted.",true);
      }catch(error){message("visits-list-message",error.message)}
    },"danger");
    card.append(core,bar);root.append(card);
  });
}
async function refreshList(){
  if(!window.ZrainVisitsBridge?.getUser()){
    saved=[];showList();message("visits-list-message","");return;
  }
  try{saved=await api("/api/v1/visits",{auth:true});showList();message("visits-list-message","");}
  catch(error){message("visits-list-message",error.message)}
}
$("visits-title").addEventListener("input",preview);
$("visits-auto-shorten").addEventListener("change",preview);
$("visits-add-page").addEventListener("click",()=>{
  addAction({id:"visit_page",label:"Visit a page",platform:"Website"});
});
$("visits-add-action").addEventListener("click",openPicker);
$("visits-picker-close").addEventListener("click",()=>$("visits-picker").close());
$("visits-picker").addEventListener("click",event=>{if(event.target===$("visits-picker"))$("visits-picker").close()});
$("visits-search").addEventListener("input",renderCatalog);
$("visits-form").addEventListener("submit",submit);
$("visits-copy-result").addEventListener("click",()=>{if(latest)copy(boundLink(latest.code))});
$("visits-qr-result").addEventListener("click",()=>{if(latest)showQr(latest)});
$("visits-refresh").addEventListener("click",refreshList);
window.addEventListener("zrain-auth-change",refreshList);
try {
  const pending=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||"null");
  if(pending && Array.isArray(pending.actions) && pending.actions.length<=20){
    $("visits-destination").value=typeof pending.destination==="string"?pending.destination:"";
    $("visits-title").value=typeof pending.title==="string"?pending.title:"";
    $("visits-auto-shorten").checked=pending.automatic === true;
    actions.push(...pending.actions.filter(a=>a && typeof a.id==="string" && typeof a.url==="string"));
  }
  sessionStorage.removeItem(DRAFT_KEY);
} catch { /* Ignore invalid or unavailable session storage. */ }
renderTabs();drawActions();
