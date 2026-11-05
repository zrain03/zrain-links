/**
 * Fail / File: cloudflare/test/provenance.test.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created: 2026-11-04
 * Dikemas kini / Last updated: 2026-11-05
 * BM: Pastikan setiap fail yang dihantar direkod tanpa mengubah JSON, migrasi atau sumber pihak ketiga.
 * EN: Check every shipped file is registered without rewriting JSON, migrations or third-party sources.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {resolve, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

// BM: Root dikira daripada fail ujian supaya sama di Windows, Linux dan CI.
// EN: Resolve the root relative to this test so it works on Windows, Linux and CI.
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const excluded = new Set(['.git', 'node_modules', '.wrangler', 'dist-pages', 'target', 'coverage', 'build', 'dist', 'modernize', '.firebase']);

/**
 * BM: Kumpul hanya fail source yang dibekalkan; jangan menginventori dependency yang dijana.
 * EN: Collect shipped source files but exclude generated dependencies and build output.
 */
async function files(dir) {
  const found=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (entry.isDirectory() && !excluded.has(entry.name)) found.push(...await files(join(dir,entry.name)));
    if (entry.isFile()) found.push(relative(root,join(dir,entry.name)).split('\\').join('/'));
  }
  return found;
}

test('every shipped file is registered with evidence-based bilingual provenance', async () => {
  // BM: Manifest JSON tidak mempunyai komen; rekodnya sendiri turut berada dalam senarai.
  // EN: The strict JSON manifest has no comments; it must include its own record.
  const registry=JSON.parse(await readFile(join(root,'FILE_PROVENANCE.json'),'utf8'));
  assert.equal(registry.developer,'Zrain');
  const all=await files(root);
  assert.deepEqual(registry.files.map(f=>f.path).sort(), all.sort());
  const iso=/^\d{4}-\d{2}-\d{2}$/;
  for (const file of registry.files) {
    assert.equal(file.developer,'Zrain',file.path);
    assert.match(file.created,iso,file.path+' created');
    assert.match(file.updated,iso,file.path+' updated');
    assert.ok(file.createdBasis && file.purposeMs && file.purposeEn,file.path+' explanation');
    // BM: Semak header hanya apabila rekod menyatakan format itu selamat untuk komen.
    // EN: Check file headers only where the registry declares a comment-safe source file.
    if (file.metadataLocation === 'file header + registry') {
      const source=await readFile(join(root,file.path),'utf8');
      const beginning=source.slice(0,1600);
      assert.match(beginning, /Developer:\s*Zrain/,file.path);
      assert.ok(beginning.includes(file.created),file.path+' creation evidence');
      assert.ok(beginning.includes(file.updated),file.path+' modification date');
      assert.match(beginning,/BM: [^\n]+\s+[^\n]*EN: /,file.path+' bilingual header');
    }
  }
});
