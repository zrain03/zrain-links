import {ACTION_CATALOG, ACTION_LABELS, createVisitsAlias, titleVisitsAlias, randomVisitsAlias, validateVisitsTitle, validateVisitsActions, validateAcknowledgements} from "./visits-core.js";
import {validateDestination} from "./core.js";
import {renderSVG} from "uqr";

const BASE = "https://zrain-links.web.app";
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const fail = (status,message) => json({message},status);
const iso = stamp => new Date(stamp*1000).toISOString();
// Surface user input errors as HTTP 400 instead of accidental server errors.
const userInput = fn => { try { return fn(); } catch (error) { throw {status:400,message:error.message}; } };
function rowToPublic(row) {
  return {id:row.id,code:row.code,title:row.title,shortUrl:BASE+"/"+row.code,
    createdAt:iso(row.created_at),views:row.view_count,unlocks:row.unlock_count};
}
async function actionsFor(db,id) {
  const result = await db.prepare("SELECT position,type,action_url FROM visits_actions WHERE link_id = ? ORDER BY position").bind(id).all();
  const labels = ACTION_LABELS;
  return (result.results || []).map(row => ({
    position:row.position,type:row.type,url:row.action_url,
    platform:labels.get(row.type)?.platform || "Other",
    label:labels.get(row.type)?.label || "Visit a page"
  }));
}
export async function handleVisits(request,db,deps) {
  const {authUser,readBody,throttle,now,id}=deps;
  const url=new URL(request.url), path=url.pathname, method=request.method;
  if (method==="GET" && path==="/api/v1/visits/catalog")
    return json(ACTION_CATALOG.map(({id,platform,label})=>({id,platform,label})));
  const pub=path.match(/^\/api\/v1\/visits\/public\/([a-zA-Z0-9][a-zA-Z0-9-]{2,29})$/);
  if (pub && method==="GET") {
    const row=await db.prepare("SELECT * FROM visits_links WHERE code_lower = ?").bind(pub[1].toLowerCase()).first();
    if (!row) return fail(404,"Visits Link not found.");
    // Counts page loads, not guaranteed unique humans; avoid conflating views with unlocks.
    await db.prepare("UPDATE visits_links SET view_count = view_count + 1 WHERE id = ?").bind(row.id).run();
    return json({...rowToPublic({...row,view_count:row.view_count+1}),actions:await actionsFor(db,row.id),
      verification:"Actions use visitor acknowledgement; external follows/subscriptions are not automatically verified."});
  }
  const unlock=path.match(/^\/api\/v1\/visits\/public\/([a-zA-Z0-9][a-zA-Z0-9-]{2,29})\/unlock$/);
  if (unlock && method==="POST") {
    await throttle(db,request,"visits-unlock",120);
    const row=await db.prepare("SELECT id,destination_url FROM visits_links WHERE code_lower = ?").bind(unlock[1].toLowerCase()).first();
    if (!row) return fail(404,"Visits Link not found.");
    const actions=await actionsFor(db,row.id);
    const body=await readBody(request);
    try { validateAcknowledgements(body?.completed,actions.length); }
    catch(e){ return fail(400,e.message); }
    await db.prepare("UPDATE visits_links SET unlock_count = unlock_count + 1 WHERE id = ?").bind(row.id).run();
    return json({destinationUrl:row.destination_url});
  }
  if(path==="/api/v1/visits" && method==="POST") {
    const user=await authUser(request,db);
    await throttle(db,request,"create-visits",40);
    const body=await readBody(request);
    const title=userInput(()=>validateVisitsTitle(body?.title));
    const destination=userInput(()=>validateDestination(body?.destinationUrl));
    if (body?.customAlias != null)
      return fail(400,"Visits Link names come from the title. Use automatic shortening for a random name.");
    if (body?.autoShorten != null && typeof body.autoShorten !== "boolean")
      return fail(400,"Automatic shortening must be enabled or disabled.");
    const automatic=body?.autoShorten === true;
    const actions=userInput(()=>validateVisitsActions(body?.actions));
    // Every normal Visits Link gets a fresh title-based suffix, even when the
    // unsuffixed title is available. Automatic shortening keeps its independent
    // random-only option, just like Direct Links.
    if (!automatic) userInput(()=>createVisitsAlias(title));
    const parsedDestination=new URL(destination);
    const linkId=id(),stamp=now();
    for (let attempt=0;attempt<12;attempt++) {
      const code=automatic ? randomVisitsAlias() : titleVisitsAlias(title);
      const lower=code.toLowerCase();
      const taken=await db.prepare("SELECT code_lower FROM link_names WHERE code_lower = ?").bind(lower).first();
      if (taken) continue;
      if (["zrain-links.web.app","zrain-links.firebaseapp.com"].includes(parsedDestination.hostname.toLowerCase())
          && parsedDestination.pathname.toLowerCase()==="/"+lower)
        return fail(400,"A Visits Link cannot redirect back to itself.");
      try {
        await db.batch([
          db.prepare("INSERT INTO visits_links (id,owner_id,code,code_lower,title,destination_url,created_at,view_count,unlock_count) VALUES (?,?,?,?,?,?,?,0,0)")
            .bind(linkId,user.id,code,lower,title,destination,stamp),
          ...actions.map((a,index)=>db.prepare("INSERT INTO visits_actions(link_id,position,type,action_url) VALUES (?,?,?,?)")
            .bind(linkId,index,a.type,a.url))
        ]);
      } catch (e) {
        // A second request can claim the same name after the availability
        // check; D1's shared link_names constraint remains authoritative.
        if (/UNIQUE constraint/i.test(String(e?.message))) continue;
        throw e;
      }
      return json({...rowToPublic({id:linkId,code,title,created_at:stamp,view_count:0,unlock_count:0}),actions},201);
    }
    return fail(409,"Could not generate an available link name. Please try again.");
  }
  if(path==="/api/v1/visits" && method==="GET"){
    const user=await authUser(request,db);
    const rows=await db.prepare("SELECT id,code,title,created_at,view_count,unlock_count FROM visits_links WHERE owner_id = ? ORDER BY created_at DESC,id DESC LIMIT 500").bind(user.id).all();
    return json((rows.results||[]).map(rowToPublic));
  }
  const personal=path.match(/^\/api\/v1\/visits\/([0-9a-f-]{36})(\/qr)?$/);
  if(personal){
    const user=await authUser(request,db);
    const link=await db.prepare("SELECT id,code,owner_id FROM visits_links WHERE id = ? AND owner_id = ?").bind(personal[1],user.id).first();
    if(!link)return fail(404,"Visits Link not found.");
    if(method==="DELETE" && !personal[2]){
      await db.prepare("DELETE FROM visits_links WHERE id = ? AND owner_id = ?").bind(link.id,user.id).run();
      return new Response(null,{status:204});
    }
    if(method==="GET" && personal[2]){
      return new Response(renderSVG(BASE+"/"+link.code),{headers:{"content-type":"image/svg+xml; charset=utf-8",
        "content-disposition":'attachment; filename="zrain-visits-'+link.code+'.svg"',"cache-control":"no-store"}});
    }
  }
  return fail(404,"Visits API endpoint not found.");
}
