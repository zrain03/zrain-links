<!--
 Fail / File: docs/ARCHITECTURE.md
 Pembangun / Developer: Zrain
 Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 Dikemas kini / Last updated: 2026-11-04
 BM: Dokumentasi khusus projek mengenai architecture.
 EN: Project documentation about architecture.
-->
# Architecture

Client -> AuthController -> AuthService -> UserRepository -> H2
                                   -> JwtService -> JwtEncoder
Client -> Spring Security -> JwtDecoder -> UserController/DemoController

- `config/`: signing configuration and access policy.
- `auth/`: registration, login, and JWT minting.
- `user/`: user entity, repository and authenticated `/me`.
- `demo/`: teaching/example endpoints; remove when creating a business app.
- `common/`: consistent API error envelopes.

Database v1: `users(id UUID PK, email UNIQUE, password_hash, role, created_at)`.

JWT contains `iss`, `sub` (UUID), `aud`, `roles`, `iat`, `exp`.
Consumers copy this *source foundation*, not a central runtime service.
