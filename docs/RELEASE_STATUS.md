# Zrain Auth Starter — Release Status

## Definition of done: reusable Java JWT starter v1.0

The purpose is a **developer-owned, self-hosted authentication foundation**, not a public multi-client OAuth/OIDC provider. Each downstream application owns its own signing secret, user database and deployment.

### Verified before this review
- `./mvnw -B clean verify` passed on GitHub Actions with **15 tests**.
- Local manual REST checks passed: registration 201, login 200, profile 200 with JWT, USER forbidden on ADMIN endpoint 403, plus five public/error-path checks.
- Java 21, Spring Boot 4.1.2, Maven Wrapper, template repository and a static documentation website are available.

### Expanded local test suite — verified 26 October 2026
Three existing test files gained five regression scenarios: absent secret, invalid token lifetime, incorrect issuer, malformed bearer token, and deleted account attempting to use its old token for `/users/me`. The user ran `./mvnw.cmd clean verify` on Windows: **20 tests passed, 0 failures, 0 errors, BUILD SUCCESS**. The Git working tree was clean immediately afterward. **The earlier confirmed GitHub Actions run covered 15 tests. CI for the expanded 20-test suite has not yet been independently verified.**

### Known design limits
- `application-local.yml` uses in-memory H2 with `create-drop`; accounts are erased on application restart. **Not deployable as a durable auth database.**
- Access JWTs have no refresh-token system or server-side revoke endpoint. A previously issued JWT could continue to authorize role-only endpoints until expiry even when account state changes.
- No email verification, password reset/recovery, anti-abuse rate limiting, audit logging or security alerting.
- Swagger/OpenAPI is permitted in the API's current Spring Security configuration. Protect it before public API deployment.
- HTTPS, CSRF/CORS strategy for the actual client, durable PostgreSQL database, schema migrations, backups, secrets management and monitoring must be configured by each application.
- The static website demo is a browser simulation with no real authentication backend, not a deployed identity service.
- Test pass rate is **not** code coverage; coverage was not measured. No independent security audit or load test has been performed.
- There is no OAuth2 Authorization Code + PKCE, OpenID Connect issuer/discovery, JWKS or dynamic client management.

## Ready for Zrain Links?
**Ready as a starting source template; not a production-ready component you can drop into a deployed app unchanged.**

### Integration checklist for Zrain Links
1. Generate a new repository from the template, **not** a shared central user database.
2. Update package/group/artifact, name, issuer and audience.
3. Replace H2 with persistent PostgreSQL, include a reviewed migration strategy and backup/restore procedure. Avoid `create-drop` on persistent environments.
4. Add Zrain Links domain models (links, ownership, redirects and analytics). Require an authenticated user subject for ownership checks; enforce this in the backend, not just the frontend.
5. Determine login UX and session storage for the actual browser/mobile client. Decide CSRF, CORS and cookie/token policy explicitly.
6. Design required account recovery, email verification, rate limiting and password-change functionality; consider token validity after permission changes.
7. Add product-specific abuse controls and integration tests, configure HTTPS and environment secrets in cloud hosting.
8. Run the Maven Wrapper build and examine GitHub Actions before every release.

## Definition of done for a separately hosted Zrain Auth Cloud
A future **distinct project**, not a checkbox on this starter: standards-based OAuth2/OpenID Connect, supported Authorization Code + PKCE flow, registered clients, reliable hosted database and service, key rotation, tenant/client boundaries, lifecycle management, abuse protection, recovery and third-party security verification. It has **not** been implemented.

## Remaining release checks
- Inspect the GitHub Actions run for the five new tests and confirm CI passes on Linux.
- Create a separate repository using **Use this template** and verify the copied project builds independently (not yet confirmed).
- The reusable starter works within its documented development scope; these checks do not turn it into a hosted production identity service.
- This project remains at Maven version `1.0.0-SNAPSHOT`; a final release tag/version has not yet been established.
