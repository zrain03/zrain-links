/**
 * Fail / File: cloudflare/scripts/build-pages.mjs
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Membina bundle Cloudflare Pages jika diperlukan.
 * EN: Build optional Cloudflare Pages bundle.
 */

import { build } from "esbuild";
import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const output = "dist-pages";
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir("public")) {
  await copyFile(join("public", entry), join(output, entry));
}
await build({
  entryPoints: ["src/index.js"],
  outfile: join(output, "_worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022"
});
console.log("Cloudflare Pages advanced mode built in dist-pages/");
