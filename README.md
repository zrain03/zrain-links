# Zrain Links

A new Spring Boot URL-shortening project built from the independently maintained [Zrain Auth Starter](https://github.com/zrain03/zrain-auth-starter).

## Current development status
A **work-in-progress backend slice** is being reviewed in the `feature/links-foundation` branch. It is not yet a finished product, and the new link features are **not yet verified by the Maven build**.

### Implemented on the development branch
- Reused register/login and JWT authorization from the starter (existing core previously verified in its original repository).
- Authenticated `POST /api/v1/links`: create a random nine-character short code pointing to an HTTPS URL.
- Authenticated `GET /api/v1/links`: list the requesting account's links and click counts.
- Authenticated `DELETE /api/v1/links/{id}`: delete only the requesting account's links.
- Public `GET /r/{code}`: redirect and increment a basic aggregate click counter.
- Authenticated `GET /api/v1/links/{id}/qr`: output the current owner's QR code as PNG.
- Added integration tests for these behaviors (pending CI validation).

### Next development work
1. Validate dependencies, compilation, integration tests and route security on GitHub Actions; correct failures before merge.
2. Replace the copied Auth Starter package names, documentation, static sample site and app icon with Zrain Links branding.
3. Add persistent PostgreSQL schema migrations and separate development/test/production profiles. **H2 local is temporary and loses data on restart.**
4. Security review: redirect abuse, phishing reports, URL/domain controls, abuse throttling, CSRF/CORS, account recovery and token lifecycle.
5. Build the user-facing link management frontend, accessible QR downloads, analytics dashboard and admin moderation tools.
6. Production deployment with secure signing secrets, domain/TLS, backups, logging, uptime monitoring, and a clear privacy policy.

### Local build (after cloning the development branch)

```powershell
git switch feature/links-foundation
.\mvnw.cmd clean verify
```

Configure `ZRAIN_JWT_SECRET_BASE64` as a random base64 secret of at least 32 bytes before running the API. See the original Auth Starter README for the local key generator. The environment variable `ZRAIN_LINKS_BASE_URL` controls the public short-URL origin; its default is `http://localhost:8080`.

Do not deploy the current development branch publicly as a finished link shortening service. Zrain Auth Starter remains independent and unchanged.
