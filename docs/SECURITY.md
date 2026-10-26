# Security and limitations

- JWT signature: HS256 with >= 32 random bytes; validate issuer, audience and expiry.
- Access tokens last 15 minutes by default and cannot be revoked immediately in this demo.
- Public registration always creates USER, never ADMIN.
- Passwords use DelegatingPasswordEncoder (BCrypt by default).
- No raw password or signing secret should appear in logs or API responses.
- Browser storage, CSRF policy, account recovery, email verification and abuse controls MUST be reconsidered for a public website.
- Stateless auth checks role claims until JWT expiry; user deletion does not revoke previously issued tokens.
- H2 creates an ephemeral schema locally. Do not use it as a persistent production user database.
- Swagger is for local learning; restrict or disable it for real deployment.
- Always use HTTPS outside localhost. Rotate secrets by application, never share signing keys between Zrain apps.
