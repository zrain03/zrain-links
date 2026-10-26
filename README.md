# Zrain Auth Starter

A reusable **Java 21 / Spring Boot 4.1.2** authentication foundation with Spring Security, registration, password hashing, JWT, role-based authorization, H2, Swagger, Maven Wrapper and automated tests.

**[Explore the public website and browser-only playground](https://zrain03.github.io/zrain-auth-starter/)** (website requires GitHub Pages to be enabled once).

> **Important:** This repository is a self-hosted **starter template**, not a shared hosted identity provider. The website playground is a JavaScript simulation: **no real accounts, credentials, server sessions, or signed JWTs** are created. Hosted authentication for third-party apps would require a separate OAuth 2.0 / OpenID Connect authorization server with appropriate security and operations.

## Requirements

- JDK **21**
- Git (to clone locally)
- Internet access the first time Maven Wrapper downloads Maven and dependencies

You **do not need to install Maven globally**. Maven Wrapper scripts are included.

## Get started on Windows (PowerShell)

1. Click **Use this template** on GitHub and clone your new repository.
2. In the cloned repository, create a fresh local signing secret for this PowerShell session:

```powershell
$bytes = [byte[]]::new(32)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$env:ZRAIN_JWT_SECRET_BASE64 = [Convert]::ToBase64String($bytes)
$env:SPRING_PROFILES_ACTIVE = "local"
```

3. Build, test and start the API:

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run
```

4. Open **http://localhost:8080/swagger-ui.html**.

On macOS/Linux, use `./mvnw clean verify` and `./mvnw spring-boot:run`, and export your secret securely.

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/users/me` | JWT |
| GET | `/api/v1/demo/public` | Public |
| GET | `/api/v1/demo/protected` | JWT |
| GET | `/api/v1/demo/admin` | ADMIN JWT |

New registrations receive the `USER` role. Tokens default to 15 minutes.

## Example API requests (PowerShell)

```powershell
$base = "http://localhost:8080"
$body = @{ email="alex@example.com"; password="A-Unique-Test-Passphrase-123!" } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/auth/register" -Method Post -ContentType "application/json" -Body $body
$login = Invoke-RestMethod "$base/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $body
Invoke-RestMethod "$base/api/v1/users/me" -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

Avoid publishing real access tokens, passwords, signing keys or screenshots containing them.

## Verification

- **20 automated tests** passed locally on 26 October 2026 (0 failures, 0 errors). The previously confirmed GitHub Actions run passed **15 tests**; CI results for the five additional tests have not yet been independently confirmed.
- Manually verified register 201, login 200, current-user 200, forbidden admin 403, and five negative API scenarios.
- Run `.\mvnw.cmd clean verify` (Windows) or `./mvnw clean verify` (macOS/Linux) to repeat the build.

A passing build does not establish full code coverage or a complete security assessment.

## Website and deployment

The responsive website lives in **`docs/index.html`**, `docs/site.css`, and `docs/site.js`. It is a **static website** and can run without a Spring Boot server.

To publish it on GitHub Pages:

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **`main`**, directory **`/docs`**, and **Save**.
4. When deployment reports success, open **https://zrain03.github.io/zrain-auth-starter/**.

The playground intentionally simulates registration, login, user-profile access and admin authorization **entirely within the browser**. Its token is a nonfunctional marker (`SIMULATED.NOT_A_REAL_JWT.NOT_SIGNED`). Do not use it to authenticate real users or connect it to production credentials.

GitHub Pages hosts **only the static frontend**. A real shared online identity provider requires a separate hosted backend with durable storage and substantial security controls.

## Reusing the template

Before using this as an application backend, change the application/package identifiers, issuer and audience, generate a unique signing key, replace in-memory H2 with durable storage and migrations, and review product-specific auth, CSRF/CORS, rate limiting, email verification, account recovery, session/token revocation, audit logging and deployment configuration.

Do **not** share the same HS256 signing secret across applications. Do **not** present this simple REST login implementation as a multi-tenant OAuth/OIDC identity provider.

See [Architecture](docs/ARCHITECTURE.md), [Security & limitations](docs/SECURITY.md), and [Release status & Zrain Links integration checklist](docs/RELEASE_STATUS.md).

## License

[MIT License](LICENSE). Developed by Zrain. Support: zrain.dev@gmail.com.
