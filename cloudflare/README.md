<!--
 Fail / File: cloudflare/README.md
 Pembangun / Developer: Zrain
 Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 Dikemas kini / Last updated: 2026-11-04
 BM: Panduan Worker, D1, ujian dan deployment.
 EN: Guide to Worker, D1, testing and deployment.
-->
# Zrain Links — Cloudflare deployment

Cloudflare Workers + D1 implementation of Zrain Links, independent from the existing Java Spring Boot backend.

## Existing D1 installation and safe deployment

The supplied project already specifies `zrain-links-db` with a D1 database ID in `wrangler.toml`. **Do not create or migrate to another D1 database** merely to perform this UI/documentation repair. The Worker, account data, and existing short URLs must remain attached to the approved database.

From PowerShell in `Zrain\Projects\zrain-links\cloudflare`, run the prerequisite verification before a deliberate deployment:

```powershell
npm ci
npm run ui:check
npm test
```

Only if verified and explicitly ready to deploy, follow the existing deployment guide in `docs/DEPLOYMENT.md` and confirm the correct Cloudflare and Firebase accounts. Review migrations separately; **do not reinitialize or delete production D1 data**.

## Important details

- This Cloudflare implementation uses D1 and *opaque 15-minute access tokens*, not the original Java HS256 JWTs. They are separate authentication systems and accounts are **not shared**.
- Sessions are held in D1, and the browser keeps the access token in memory only; refresh requires logging in again.
- Cloudflare QR downloads use SVG, not Java PNG. Both are valid scannable QR image formats.
- D1 retains data across deployments; back up exports regularly. There is no guarantee of indefinite service availability on a free tier.
- Free Workers have quotas. Use strict signup/link limits, monitoring and moderation before opening the website to strangers.
- Current schema is a starting point: no email verification or password reset, no domain ownership support and no guarantee that destinations are safe from phishing. Do **not** publicly launch open registration without abuse and security review.
- This repository is still in a development branch; merging and final live deployment are separate checks.

## Local validation

```powershell
cd cloudflare
npm install
npm test
npx wrangler d1 migrations apply zrain-links-db --local
npm run dev
```

## End-to-end local smoke test before public release

Open two PowerShell terminals. In terminal A:

```powershell
cd "$HOME\Downloads\zrain-links\cloudflare"
npx wrangler d1 migrations apply zrain-links-db --local
npx wrangler dev --local
```

In terminal B:

```powershell
cd "$HOME\Downloads\zrain-links\cloudflare"
node test/smoke.mjs
npm audit --omit=dev
npm audit
```

The smoke script uses a newly generated fictional account and checks register, login, auth, unsafe URL rejection, custom aliases, redirect, visit counter, QR and deletion. The script runs **only against local Wrangler/D1** and does not affect the already migrated remote database. Do not deploy publicly unless all checks pass and the vulnerability findings have been reviewed. The cloud-hosted password hashing cost must be validated against Workers Free limits before production.

## Optional shorter Pages address

Cloudflare Workers always includes the account subdomain. A Pages project named `zrain-links`, if available, can instead use `https://zrain-links.pages.dev`. This does **not** shorten existing Workers links; it introduces a new host. Before switching, verify redirects and avoid deleting the old Worker, or old links may break.

From the `cloudflare` folder:

```powershell
npm install
npm run build:pages
npx wrangler pages project create zrain-links
npx wrangler pages deploy dist-pages --project-name zrain-links
```

**Important:** The Pages project also requires a separate D1 binding named `DB`, connected to the existing `zrain-links-db` database, in **Workers & Pages → zrain-links → Settings → Bindings → Add D1**. Do not create a new database. The Pages app is not fully functional until that binding is available and the Pages deployment has been refreshed. Never delete existing Workers URLs during this transition.

## Debug live signup

If the live website shows `Request could not be completed` during signup, run `npx wrangler tail zrain-links --format pretty` in one PowerShell terminal and reproduce registration with a **fresh test account** in another browser tab. The server log should expose the actual error, without needing to send passwords or authentication tokens. Do not log user-submitted passwords. The free Workers plan has strict per-request CPU limits, which may affect PBKDF2 hashing. Do not weaken password hashing as a workaround.
