# Zrain Links

**Create recognizable links with names you choose.** Zrain Links is a custom-link manager, not primarily a URL shortener.

## Shared Zrain UI: official Git dependency

The **Firebase / Cloudflare frontend** in `cloudflare/public` uses the pinned GitHub dependency `@zrain/ui` from [zrain03/zrain-ui](https://github.com/zrain03/zrain-ui). Its `brand.css`, `zrain-ui.js` and `zrain-logo.webp` are synchronized from the dependency, not maintained as independent design files. Changes to Direct/Visits Link behavior remain in this repository.

To update and publish the latest code on the `feature/links-foundation` branch using PowerShell:

```powershell
git pull --ff-only origin feature/links-foundation
.\deploy-zrain-links.ps1
```

The deploy script runs `npm install`, `npm run ui:sync`, `npm test`, Cloudflare Worker deployment and Firebase Hosting deployment, stopping on errors. A plain Git push or pull **does not update the live website**. Local authentication with Wrangler/Firebase is still required, and frontend changes should be checked in a browser.

The package is pinned to commit `af77e6782bdfa168296c1fe14061d72a1e400c55` for reproducible builds. When upgrading to a newer Zrain UI version, explicitly update the Git dependency SHA, run `npm install`, sync, test and commit the changed assets and lockfile. CI checks that the locally served assets match the pinned upstream package.


## User flow

1. Paste a public HTTPS destination URL.
2. Choose a memorable **link name** (required by default), such as `claimmp`.
3. Click **Create link**. If not signed in, complete sign-in/sign-up and the form will continue.
4. Copy the new URL, download its QR code, or view it under **My links**.
5. Optional: check **Shorten link automatically**. This disables the manual name field and generates a random alias instead.
6. A secondary shorter **domain** is a separate deployment feature and is only shown in the Spring Boot version when an actual second hostname is configured.

The project currently has **two frontend deployment variants**, both redesigned with the same custom-link-first interface:
- Java Spring Boot local frontend: `src/main/resources/static/`.
- Firebase/Cloudflare frontend: `cloudflare/public/`.

An actual permanent public service still requires verified domains, persistent storage, uptime/backup operations and abuse prevention. Running the Java backend with local H2 does **not** make links permanent.

---


A new Spring Boot URL-shortening project built from the independently maintained [Zrain Auth Starter](https://github.com/zrain03/zrain-auth-starter).

## Current development status
A **work-in-progress backend slice** is being reviewed in the `feature/links-foundation` branch. It is not yet a finished product, and the new link features are **not yet verified by the Maven build**.

### Implemented on the development branch
- Reused register/login and JWT authorization from the starter (existing core previously verified in its original repository).
- Authenticated `POST /api/v1/links`: create a random short code or specify an optional `customAlias` (3–30 lowercase letters, digits, hyphens). Existing aliases and reserved paths are rejected.
- Authenticated `GET /api/v1/links`: list the requesting account's links and click counts.
- Authenticated `DELETE /api/v1/links/{id}`: delete only the requesting account's links.
- Public `GET /{code}`: redirect and increment aggregate clicks. Legacy `GET /r/{code}` remains operational.
- Authenticated `GET /api/v1/links/{id}/qr`: output the current owner's QR code as PNG.
- Added integration tests for these behaviors (pending CI validation).

### Web interface
A new responsive **Spring Boot-served frontend** lives at `src/main/resources/static/`: `index.html`, `app.css`, `app.js` and `favicon.svg`. It connects to real REST endpoints on the **same origin**, provides registration/login, account-specific short links, QR PNG downloads, visit counts and link deletion.

The browser access token currently stays **only in memory**, not in localStorage; the user must sign in again after reloading. Do not deploy publicly until token/session UX, account recovery, abuse protection, safe redirect operations and deployment policy have been reviewed.

### Database profiles
- `local` and `test`: ephemeral H2 schema, Flyway disabled.
- `prod`: PostgreSQL required via `DB_JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD`, with Flyway migration `V1__create_users_and_links.sql` and schema validation.
- Set `ZRAIN_LINKS_BASE_URL` to the externally accessible application origin so short links and QR codes use the correct hostname.
- The PostgreSQL profile and migration are **not yet demonstrated against a deployed PostgreSQL instance**.

### Custom names and domains
Use `POST /api/v1/links` with `{"destinationUrl":"https://example.com/page","customAlias":"randomgenerator"}` to create an example short URL such as `http://localhost:8081/randomgenerator`. Omitting `customAlias` produces a random name. The platform domain comes from `ZRAIN_LINKS_BASE_URL` and is controlled by the **operator**, not by arbitrary visitors.

**Custom domain support is not live yet.** A user-owned domain (for example `go.example.com`) requires proof of ownership, DNS configuration, HTTPS certificates, verified host-based routing and domain lifecycle management. The app must never redirect using an unverified request Host header. Do not advertise user-supplied domains as operational until these safeguards and hosting are implemented and tested.

### Next development work
1. Confirm CI for the latest frontend, migration and configuration changes; review failures before merge.
2. Replace the copied Auth Starter package names, documentation, static sample site and app icon with Zrain Links branding.
3. Add persistent PostgreSQL schema migrations and separate development/test/production profiles. **H2 local is temporary and loses data on restart.**
4. Security review: redirect abuse, phishing reports, URL/domain controls, abuse throttling, CSRF/CORS, account recovery and token lifecycle.
5. Extend the working frontend with accessible notifications, richer analytics, user onboarding and admin moderation tools.
6. Production deployment with secure signing secrets, domain/TLS, backups, logging, uptime monitoring, and a clear privacy policy.

### Local build (after cloning the development branch)

```powershell
git switch feature/links-foundation
.\mvnw.cmd clean verify
```

Configure `ZRAIN_JWT_SECRET_BASE64` as a random base64 secret of at least 32 bytes before running the API. See the original Auth Starter README for the local key generator. The environment variable `ZRAIN_LINKS_BASE_URL` controls the public short-URL origin; its default is `http://localhost:8080`.

Do not deploy the current development branch publicly as a finished link shortening service. Zrain Auth Starter remains independent and unchanged.

### Public release blockers
- Restrict phishing, malicious links and abusive usage; create reporting/moderation controls and apply rate limits.
- Verify PostgreSQL/Flyway integration, backups, HTTPS and the target cloud deployment.
- Review cross-user isolation, redirects and frontend security with tests and perform a manual end-to-end browser test.
- The starter's documentation site copied in `/docs` is not the active Zrain Links frontend; do not publish it as the Links website.
