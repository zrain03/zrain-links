<!--
 Fail / File: docs/AI_HANDOFF.md
 Pembangun / Developer: Zrain
 Dicipta / Created: 2026-11-04
 Dikemas kini / Last updated: 2026-11-04
 BM: Serahan teknikal mengenai architecture, kontrak, keselamatan dan cara sambung kerja Zrain Links.
 EN: Technical handoff for Zrain Links architecture, contracts, security and continuation.
-->
# Zrain Links | AI and Developer Handoff

## BM: Tujuan dan baseline

- **Produk aktif:** `cloudflare/public/` (frontend Firebase Hosting) dan `cloudflare/src/` (Cloudflare Worker + D1).
- **Repo:** `https://github.com/zrain03/zrain-links`, branch asal ZIP `feature/links-foundation`, commit `8c39543`.
- **Shared UI:** `@zrain/ui` dipin pada `a109401fa591afa9f66479fa8d86f1ed1679d70b`. Salinan `brand.css`, `zrain-ui.js`, `zrain-logo.webp` dalam `cloudflare/public/` mesti sama byte demi byte dengan upstream.
- **Backend tambahan:** Java Spring Boot dan `docs/index.html` berasal daripada fasa lama; jangan anggap ia backend sebenar bagi pengguna Cloudflare. Jangan padam tanpa semakan references, sejarah deployment dan persetujuan.
- **Perubahan 2026-11-04:** penjajaran UI sahaja serta metadata, ujian dan dokumentasi. Tiada schema, auth logic, D1 state atau public endpoint diubah.

## BM: Sempadan fungsi yang wajib kekal

- Firebase Auth bagi browser; Worker memeriksa identiti melalui token Firebase dan mengasingkan pemilik pautan. Jangan menggantikan Firebase Auth dengan Java JWT atau identity provider bersama.
- D1 binding `DB`, migration `cloudflare/migrations/0001_initial.sql`, `0002_admin_controls.sql`, `0003_visits_links.sql` dikekalkan seperti asal.
- Public short links berasaskan `https://zrain-links.web.app` dan Worker `https://zrain-links.zrain-dev.workers.dev`. Jangan mengubah domain, alias, redirect atau URL origin tanpa migration/deployment plan.
- `Visits Links`: tindakan ditanda selesai oleh pelawat; ini bukan verifikasi automatik platform sosial. Kukuhkan hanya melalui perubahan produk yang diluluskan.
- Dashboard admin hanya untuk UID yang dibenarkan dan tindakan hapus memerlukan pengesahan baru. Jangan mengurangkan pemeriksaan untuk memudahkan pengujian UI.
- Menu utama, menu admin dan tindakan unlock kekal milik app. `mountZrainUI` hanya mengurus logo, nama produk dan identiti footer. `link-section-nav.js` mengurus scroll-aware tabs pada halaman utama.

## BM: Pemetaan folder

| Folder | Peranan |
| --- | --- |
| `cloudflare/public/` | Halaman Direct Links, Visits Links, unlock, admin, CSS, JS dan logo |
| `cloudflare/src/` | Routes, pengesahan, authorization, validasi, D1, stats |
| `cloudflare/migrations/` | Schema D1 tersusun; jangan ubah migration yang sudah dipakai |
| `cloudflare/test/` | Ujian Node terasing daripada akaun produksi |
| `cloudflare/scripts/` | UI sync dan build optional Cloudflare Pages |
| `src/` | Prototaip Java/Spring Boot yang berasingan |
| `docs/` | Rekod keputusan, security, deployment dan dokumentasi sejarah |
| `FILE_PROVENANCE.json` | Metadata semua source, termasuk JSON, fail binary dan fail format khusus |

## BM: Pemasangan dan pengujian (Windows PowerShell)

```powershell
cd "$env:USERPROFILE\Downloads\Zrain\Projects\zrain-links\cloudflare"
npm ci
npm run ui:check
npm test
```

`npm ci` memerlukan akses npm/GitHub untuk dependency `@zrain/ui` dan pakej Wrangler, jose serta uqr. Ujian Java memerlukan Java 21 dan dependencies Maven; jalankan dari root projek menggunakan `./mvnw.cmd clean verify` hanya apabila toolchain tersedia. Ujian langsung Worker/D1 memerlukan `wrangler dev` dengan konfigurasi tempatan yang benar. **Tiada ujian terhadap database produksi perlu dijalankan untuk perubahan UI ini.**

## BM: Deploy dan rollback

1. Simpan working tree semasa, pastikan branch `feature/links-foundation` dan baseline direkod.
2. Extract patch sebagai overlay ke folder asal, bukannya memadam `.git`, migrasi atau fail lain.
3. Semak `git diff --check`, `git diff --stat`, `npm ci`, `npm run ui:check`, `npm test`.
4. Jalankan browser smoke pada viewport desktop dan mobile untuk halaman utama, unlock dan admin. Uji navigasi, keadaan signed-in/signed-out, unauthorized admin, dan Back/Forward.
5. Deploy hanya selepas kelulusan, menggunakan proses Firebase/Cloudflare sedia ada. Jangan force-push atau ubah D1 binding.
6. Rollback aplikasi menggunakan commit Git baseline atau backup folder yang diambil sebelum overlay; jangan rollback database tanpa pelan migrasi sebenar.

## BM: Had verifikasi semasa

- Audit ZIP dan ujian Node tanpa dependency awam boleh dijalankan di persekitaran semakan.
- `npm ci`, ujian integrasi Worker/D1 sebenar, Firebase Sign-in, Maven test dan browser deployment produksi memerlukan akses/tooling luaran. Jangan mendakwa ia lulus jika belum dijalankan.
- Komen fungsi terperinci dan audit behaviour seluruh kod warisan memerlukan semakan mendalam berasingan. Penambahan header metadata **tidak membuktikan** setiap function sudah mempunyai penjelasan BM/EN menyeluruh.

## EN: Quick handoff

The active stack is Firebase Hosting + Cloudflare Worker/D1. Preserve D1 migrations, Firebase account ownership, short-link URL contracts, the admin permission gates and the Visits Links visitor confirmation model. The Java/Spring Boot tree is a separate historical prototype. The UI repair updates the pinned `@zrain/ui` identity and all three Cloudflare pages without changing product navigation or backend behavior. Source provenance is inventoried in `FILE_PROVENANCE.json`. Run `npm ci`, `npm run ui:check`, `npm test` and authorized browser checks before deployment. Production deployment and a full backend security audit are **not** implied by a successful static or unit test.
