# Zrain Links — Long-lived deployment plan

**Goal:** short links keep working for years on a memorable domain. No hosting provider or domain registrar guarantees literal forever. Durability requires a domain that is owned and renewed, continuously running hosting, a persistent database with tested backups, and an ability to restore or migrate.

## Domain first
- The desired URL `https://zrain.com/claimmp` requires the domain **zrain.com** to be owned or otherwise legally controlled by this operator. Ownership and availability have **not been verified**. Do not advertise that hostname yet.
- Once the operator controls the domain, add its DNS records in the registrar/DNS provider, bind the custom domain to the host, verify TLS issuance, and set `ZRAIN_LINKS_BASE_URL=https://zrain.com`.
- The `/claimmp` part is user-selectable today; custom domains per individual end-user are still not supported. Domain aliases must be verified independently before onboarding.

## Backend and persistence
- **Never** deploy `SPRING_PROFILES_ACTIVE=local` or in-memory H2 to a public service; it erases the short-link mappings on restart.
- The `prod` profile uses PostgreSQL and Flyway with `ddl-auto: validate`. Supply `DB_JDBC_URL`, `DB_USERNAME`, `DB_PASSWORD` from the hosting secret manager.
- Use a **long-lived PostgreSQL plan** with automated backups, and manually perform a restore test before launch. Render Free PostgreSQL expires after 30 days and must not be used for permanent short links. A free preview database created on 26 Oct 2026 expires on 25 Nov 2026; it is not the permanent database.
- Use a **non-sleeping hosted web plan** for the Java redirect service. Render Free Web can spin down on idle and is unsuitable for guaranteed immediate redirects.
- Configure `ZRAIN_JWT_SECRET_BASE64` with a persistent, securely stored, randomly generated Base64 signing key of at least 32 random bytes. It must not rotate unintentionally on redeploy.
- Set `ZRAIN_LINKS_BASE_URL` to the final verified HTTPS domain; **never derive the canonical short URL from an untrusted Host header**.
- `/actuator/health` is available for monitoring and includes a database availability indicator, without exposing detailed health data in the production profile.
- Use alerting (e.g., UptimeRobot) against the public `/actuator/health` endpoint. **A monitor cannot keep an expired database alive or guarantee always-on hosting.**

## Keep links alive through incidents
1. Renew domain registration automatically and keep a backup payment method.
2. Enable automatic DB backups plus periodic off-site exports; regularly test restoration, including aliases and click counts.
3. Document DNS/hosting migration and use a single canonical domain for short links, so moving backend providers does not change URLs.
4. Back up important application configuration and Java signing keys in protected secret storage.
5. Monitor HTTPS endpoint, DNS expiry, TLS renewal, PostgreSQL capacity, error rate and backup success.
6. Apply abuse controls (signup throttling, URL reputation/reporting, moderation, suspicious redirect detection) before accepting public registrations. No such general-public security review has been completed.
7. Verify PostgreSQL migrations with a real instance, run browser E2E tests, and test a restart with previously created links to confirm persistence.

## Deployment configuration
The repository includes `Dockerfile`, `render.yaml`, and `application-prod.yml`. These provide a starting point, **not** a deployed production service. `render.yaml` currently specifies Render Free; **do not use it for a permanence promise**. Choose a non-sleeping plan intentionally through the provider UI, with clear pricing accepted by the operator.

## Release gates
- [x] Java backend and single-domain custom alias functionality developed.
- [x] Production-profile PostgreSQL/Flyway configuration present.
- [x] Health endpoint and minimal operational exposure configured.
- [ ] Domain purchased/ownership confirmed, DNS configured, HTTPS verified.
- [ ] Non-expiring persistent production database and restore tested.
- [ ] Non-sleeping production web service configured and deployed.
- [ ] Anti-abuse safeguards and security review completed.
- [ ] End-to-end tests against real production-like deployment, including restart persistence.
- [ ] Live URL publicly verified.

Do not merge or launch this branch as a complete public service until these gates are met.
