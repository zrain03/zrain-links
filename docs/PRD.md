# Product Requirements: Zrain Auth Starter

## Goal
Reusable Spring Boot JWT authentication foundation for independent Zrain Java applications.

## User
Java developer who wants a secure, testable starting point, not a hosted authentication SaaS.

## Required
- Local register and login via JSON REST API.
- Password hashes and case-normalized unique emails.
- Signed HS256 JWT with issuer, audience, 15-minute expiry and roles.
- Public, protected and admin-only demo endpoints.
- H2 demo persistence, Swagger documentation and automated tests.
- GitHub template, readable setup guide and CI.

## Not in v1
- Hosted public auth service, account recovery, email verification, social login.
- Refresh tokens, global revocation, dynamic permissions, notifications.
- Production-ready account management or rate-limiting guarantees.

## Acceptance
All planned endpoints work locally and malicious/invalid JWTs are rejected by the real security filter chain.
