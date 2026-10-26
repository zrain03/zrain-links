# Zrain Auth Starter — Verification checklist

- [x] Build project with Java 21 / Spring Boot 4.1.2.
- [x] Verify register, login, protected profile and USER/ADMIN access with running REST API.
- [x] Verify negative cases: wrong credentials, invalid/expired/wrong-audience tokens, 403, duplicate email.
- [x] Run Maven Wrapper `clean verify` locally: **20 tests passed on 26 Oct 2026**.
- [x] Confirm initial GitHub Actions run passed (15-test suite before additional scenarios).
- [x] Review source for JWT validation, secret requirements, access controls and error responses; document known production limitations.
- [x] Enable GitHub template repository.
- [ ] Confirm GitHub Actions passes the updated 20-test suite.
- [ ] Generate a separate repository from the template and verify it builds independently.
- [ ] Confirm a release version/tag, if distributing a versioned release.

See [Release status](RELEASE_STATUS.md). Production-readiness work is per downstream application.
