/**
 * Synchronize official Zrain UI assets from the version-pinned GitHub package
 * installed at node_modules/@zrain/ui.
 *
 * Run "npm run ui:sync" to update static assets.
 * Run "npm run ui:check" to ensure the deployed files match the dependency.
 * This does not alter API, auth, product navigation, or page-specific CSS.
 */
import {readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,"package.json"),"utf8"));
const publicDir=pkg.zrainUi?.publicDir;
if(typeof publicDir!=="string" || !publicDir || path.isAbsolute(publicDir) ||
    publicDir.split(/[\\/]/).includes("..")) {
  throw new Error("Configure a safe relative zrainUi.publicDir in package.json.");
}
const dest=path.resolve(root,publicDir);
const upstream=path.join(root,"node_modules","@zrain","ui");
const files=[
  ["src/brand.css","brand.css"],
  ["src/zrain-ui.js","zrain-ui.js"],
  ["assets/zrain-logo.webp","zrain-logo.webp"]
];
const checkOnly=process.argv.includes("--check");
let differences=0;
for(const [sourceName,targetName] of files){
  let source;
  try {
    source=await readFile(path.join(upstream,sourceName));
  } catch {
    throw new Error("Zrain UI dependency is missing. Run npm install first.");
  }
  const destination=path.join(dest,targetName);
  const existing=await readFile(destination).catch(error=>{
    if(error?.code==="ENOENT")return null;
    throw error;
  });
  if(!existing || !existing.equals(source)){
    differences++;
    if(checkOnly)console.error("Out of sync: "+path.relative(root,destination));
    else {
      await writeFile(destination,source);
      console.log("Updated from @zrain/ui: "+path.relative(root,destination));
    }
  }
}
if(checkOnly && differences){
  console.error("Zrain UI is out of sync. Run npm run ui:sync, then retest.");
  process.exitCode=1;
} else {
  console.log(checkOnly ? "Zrain UI matches the pinned GitHub dependency." :
    "Zrain UI synchronized. "+differences+" file(s) updated.");
}
