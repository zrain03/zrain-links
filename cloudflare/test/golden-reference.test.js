/**
 * Fail / File: cloudflare/test/golden-reference.test.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created: 2026-11-04
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Uji keseragaman tiga halaman dan pengasingan navigasi Zrain Links daripada shared UI.
 * EN: Verify all three pages share Zrain identity without surrendering product-owned navigation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// BM: Periksa fail statik secara terus; tidak perlu Firebase atau sesi pengguna.
// EN: Inspect static files directly; Firebase and user sessions are not required.
const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const pages = ['index.html', 'admin.html', 'visit.html'];

test('all public-facing app pages use the official ecosystem identity and footer', async () => {
  // BM: Pastikan setiap halaman menyediakan target pemasangan sama untuk @zrain/ui.
  // EN: Ensure every page provides the same @zrain/ui mounting targets.
  for (const page of pages) {
    const html = await read('../public/' + page);
    assert.match(html, /class="topbar zrain-header"/, page);
    assert.match(html, /class="brand zrain-brand"/, page);
    assert.match(html, /class="zrain-brand__home" href="https:\/\/zrain\.web\.app"/, page);
    assert.match(html, /class="zrain-brand__product" href="\/"/, page);
    assert.match(html, /class="footer-brand zrain-footer__identity"/, page);
    assert.match(html, /class="zrain-footer__home" href="https:\/\/zrain\.web\.app"/, page);
    assert.match(html, /Developed by Zrain/, page);
    assert.match(html, /Made for people\. Built with purpose\./, page);
    assert.match(html, /zrain-ui-config\.js\?v=ui-20261104-golden/, page);
    assert.match(html, /href="#main"/, page);
    assert.match(html, /id="main"/, page);
    const header = html.split('</header>')[0];
    assert.doesNotMatch(header, /Made for people\. Built with purpose\./, page);
  }
});

test('unlock page retains its action contracts and its own navigation', async () => {
  // BM: Branding tidak boleh memadam data hook yang digunakan oleh visit-page.js.
  // EN: Branding must not remove data hooks used by visit-page.js.
  const html = await read('../public/visit.html');
  for (const id of ['visit-heading','visit-intro','visit-actions','visit-error','visit-unlock','visit-views','visit-unlocks']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(html, /href="\/#visits-links"/);
  assert.match(html, /src="\/visit-page\.js\?/);
  const config = await read('../public/zrain-ui-config.js');
  assert.match(config, /product: "Links"/);
  assert.doesNotMatch(config, /navigation\s*:/);
  assert.doesNotMatch(config, /footerLinks\s*:/);
});

test('installed shared files are reproducible from one pinned commit', async () => {
  // BM: Elakkan asset drift apabila dependency sudah dipin tetapi fail tidak disegerakkan.
  // EN: Prevent asset drift when the dependency is pinned but served files are stale.
  const [pkg, lock, css, js] = await Promise.all([
    read('../package.json'), read('../package-lock.json'),
    read('../public/brand.css'), read('../public/zrain-ui.js')
  ]);
  const sha = 'a109401fa591afa9f66479fa8d86f1ed1679d70b';
  assert.match(pkg, new RegExp(sha));
  assert.match(lock, new RegExp(sha));
  assert.match(css, /zrain-header/);
  assert.match(js, /ZRAIN_TAGLINE/);
});
