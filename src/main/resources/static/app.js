"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const authForm=$("auth-form"), createForm=$("create-form"), list=$("links-list");
  let token=null, email=null, authMode="signin", links=[];
  const show=(id,visible)=>{$(id).hidden=!visible;};
  function toast(message){const t=$("toast");t.textContent=message;t.hidden=false;setTimeout(()=>t.hidden=true,3200);}
  function message(id,text,ok=false){const el=$(id);el.textContent=text;el.classList.toggle("ok",ok);}
  async function api(path,{method="GET",body=null,auth=true}={}){
    const headers={};
    if(body!==null) headers["Content-Type"]="application/json";
    if(auth&&token) headers.Authorization="Bearer "+token;
    let response;
    try {response=await fetch(path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store"});}
    catch {throw Error("Cannot reach the server. Check your connection and try again.");}
    if(!response.ok){
      let reason=null;try{reason=(await response.json()).message;}catch{}
      if(response.status===401&&auth){signout();throw Error("Session expired. Please sign in again.");}
      throw Error(reason||("Request failed ("+response.status+")."));
    }
    if(response.status===204)return null;
    return response.headers.get("content-type")?.includes("application/json")?response.json():response;
  }
  function setAuthMode(mode){
    authMode=mode;
    document.querySelectorAll("[data-auth-mode]").forEach(b=>{const active=b.dataset.authMode===mode;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
    $("auth-submit").firstChild.textContent=mode==="signin"?"Sign in ":"Create account ";
    $("password").autocomplete=mode==="signin"?"current-password":"new-password";
    $("password").minLength=mode==="signin"?1:12;
    $("password-hint").textContent=mode==="signin"?"":"At least 12 characters";
    $("auth-caption").textContent=mode==="signin"?"Sign in to manage your short links.":"Create an account to keep your links organized.";
    message("form-message","");
  }
  function signout(){
    token=null;email=null;links=[];
    $("password").value="";
    show("auth-section",true);show("dashboard",false);
    show("toast",false);
  }
  async function authSubmit(event){
    event.preventDefault();
    const button=$("auth-submit");button.disabled=true;message("form-message","");
    const e=$("email").value.trim(),p=$("password").value;
    try {
      if(authMode==="signup"){
        await api("/api/v1/auth/register",{method:"POST",body:{email:e,password:p},auth:false});
        setAuthMode("signin");$("password").value="";
        message("form-message","Account created. Sign in with your password.",true);
        return;
      }
      const result=await api("/api/v1/auth/login",{method:"POST",body:{email:e,password:p},auth:false});
      if(!result.accessToken) throw Error("The server did not return a valid access token.");
      token=result.accessToken;email=e;
      show("auth-section",false);show("dashboard",true);
      $("signed-in-as").textContent="Signed in as "+email;
      await refresh();
      toast("Welcome to your link studio.");
    }catch(error){message("form-message",error.message);}finally{button.disabled=false;}
  }
  function render(){
    const count=links.reduce((total,l)=>total+(l.clickCount||0),0);
    $("total-links").textContent=String(links.length);$("total-clicks").textContent=count.toLocaleString();$("total-qrs").textContent=String(links.length);
    list.replaceChildren();
    if(!links.length){const div=document.createElement("div");div.className="empty-links";const title=document.createElement("strong");title.textContent="No links yet";const note=document.createElement("p");note.textContent="Paste your first URL above to get started.";div.append(title,note);list.append(div);return;}
    for(const link of links){
      const card=document.createElement("article");card.className="link-card";
      const info=document.createElement("div");info.className="link-core";
      const anchor=document.createElement("a");anchor.textContent=link.shortUrl;anchor.href=link.shortUrl;anchor.target="_blank";anchor.rel="noopener noreferrer";
      const destination=document.createElement("p");destination.className="destination";destination.textContent=link.destinationUrl;
      const meta=document.createElement("div");meta.className="link-meta";
      const visits=document.createElement("span");visits.textContent=(link.clickCount||0)+" visits";
      const when=document.createElement("span");when.textContent=new Date(link.createdAt).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
      meta.append(visits,when);info.append(anchor,destination,meta);
      const actions=document.createElement("div");actions.className="link-actions";
      function action(label,callback,extra=""){const b=document.createElement("button");b.type="button";b.textContent=label;b.className=extra;b.addEventListener("click",callback);actions.append(b);}
      action("Copy",async()=>{try{await navigator.clipboard.writeText(link.shortUrl);toast("Short link copied.");}catch{toast("Copy unavailable. You can select the address instead.");}});
      action("Download QR",async()=>{try{const res=await api("/api/v1/links/"+encodeURIComponent(link.id)+"/qr");const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="zrain-links-"+link.code+".png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast(e.message);}});
      action("Delete",async()=>{if(!confirm("Delete this short link? People will no longer be able to use it."))return;try{await api("/api/v1/links/"+encodeURIComponent(link.id),{method:"DELETE"});toast("Link deleted.");await refresh();}catch(e){toast(e.message);}},"danger");
      card.append(info,actions);list.append(card);
    }
  }
  async function refresh(){message("list-status","Loading your links…");try{links=await api("/api/v1/links");render();message("list-status","");}catch(e){message("list-status",e.message);}}
  async function create(event){
    event.preventDefault();const btn=$("create-button");btn.disabled=true;message("create-message","");
    try{
      const url=$("long-url").value.trim();
      if(!url.startsWith("https://"))throw Error("Use a public HTTPS URL starting with https://");
      const link=await api("/api/v1/links",{method:"POST",body:{destinationUrl:url}});
      $("long-url").value="";await refresh();toast("Your new link is ready!");setTimeout(()=>document.getElementById("links-title").scrollIntoView({behavior:"smooth"}),100);
    }catch(e){message("create-message",e.message);}finally{btn.disabled=false;}
  }
  document.querySelectorAll("[data-auth-mode]").forEach(b=>b.addEventListener("click",()=>setAuthMode(b.dataset.authMode)));
  authForm.addEventListener("submit",authSubmit);createForm.addEventListener("submit",create);
  $("signout").addEventListener("click",signout);$("refresh-links").addEventListener("click",refresh);
  setAuthMode("signin");
})();