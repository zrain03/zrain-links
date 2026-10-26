# Zrain Links — Cloudflare deployment

Cloudflare Workers + D1 implementation of Zrain Links, independent from the existing Java Spring Boot backend.

## One-time setup in Cloudflare dashboard

1. Go to **Storage & databases → D1 → Create database** and name it `zrain-links-db`.
2. Copy the database's **Database ID** (UUID) from its D1 overview, then replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `cloudflare/wrangler.toml`. Commit that config change to the development branch. The D1 database ID is not a secret.
3. On Windows PowerShell, from the repository root run:

```powershell
cd cloudflare
npm install
npx wrangler login
npx wrangler d1 migrations apply zrain-links-db --remote
npx wrangler deploy
```

4. Cloudflare will print an actual HTTPS URL such as `https://zrain-links.zrain-dev.workers.dev`. Verify `/api/health` and create a test account and alias. The exact URL is not guaranteed until Cloudflare confirms the deployment.
5. Optional automated Git deploys: configure Workers & Pages to deploy the GitHub repo with root directory `/cloudflare`, build command `npm install`, and deploy command `npx wrangler deploy` once the D1 ID and migrations are configured.

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
