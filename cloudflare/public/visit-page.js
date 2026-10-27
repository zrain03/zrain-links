const $=id=>document.getElementById(id);
const API="https://zrain-links.zrain-dev.workers.dev";
const code=new URLSearchParams(location.search).get("code");
const completed=new Set();
let actions=[];
function text(tag,value,className){const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(className)el.className=className;return el}
function render(){
  const root=$("visit-actions");root.replaceChildren();
  actions.forEach((action,index)=>{
    const card=text("article",undefined,"visit-step");
    const title=text("div");title.append(text("strong",(index+1)+". "+action.label),text("small",action.platform));
    const buttons=text("div",undefined,"visit-step-actions");
    const open=text("a",action.type==="visit_page"?"↗ Visit a page":"↗ Open action","visit-open-action");
    open.href=action.url;open.target="_blank";open.rel="noopener noreferrer";
    const confirm=text("button",completed.has(index)?"✓ Marked complete":"Mark complete");
    confirm.type="button";confirm.disabled=!completed.has(index);
    open.addEventListener("click",()=>{
      confirm.disabled=false;
      confirm.textContent="I completed this";
    });
    confirm.addEventListener("click",()=>{
      if(completed.has(index)){completed.delete(index);confirm.textContent="I completed this"}
      else{completed.add(index);confirm.textContent="✓ Marked complete"}
      $("visit-unlock").disabled=completed.size!==actions.length;
      $("visit-unlock").textContent=completed.size===actions.length?"🔓 Unlock link":"🔒 Unlock link";
    });
    buttons.append(open,confirm);card.append(title,buttons);root.append(card);
  });
}
async function load(){
  if(!code || !/^[a-zA-Z0-9][a-zA-Z0-9-]{2,29}$/.test(code)){
    $("visit-heading").textContent="Invalid link";$("visit-error").textContent="This Visits Link address is invalid.";return;
  }
  try{
    const response=await fetch(API+"/api/v1/visits/public/"+encodeURIComponent(code),{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw Error(data.message||"Visits Link unavailable");
    $("visit-heading").textContent=data.title;document.title=data.title+" | Zrain Links";
    $("visit-views").textContent="◉ "+data.views+" views";
    $("visit-unlocks").textContent="♧ "+data.unlocks+" unlocks";
    $("visit-intro").textContent="Open each action, then confirm you completed it to unlock the destination.";
    actions=data.actions;render();
  }catch(e){$("visit-heading").textContent="Link unavailable";$("visit-error").textContent=e.message}
}
$("visit-unlock").addEventListener("click",async()=>{
  const button=$("visit-unlock");button.disabled=true;
  try{
    const res=await fetch(API+"/api/v1/visits/public/"+encodeURIComponent(code)+"/unlock",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({completed:[...completed].sort((a,b)=>a-b)}),cache:"no-store"
    });
    const data=await res.json();
    if(!res.ok)throw Error(data.message||"Cannot unlock this link");
    window.location.assign(data.destinationUrl);
  }catch(e){$("visit-error").textContent=e.message;button.disabled=false}
});
load();
