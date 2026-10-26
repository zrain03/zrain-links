# Dual-domain link URLs

The Spring Boot application supports two verified public origins, without relying on user-supplied hostnames.

## What is implemented
- User enters HTTPS destination and optional alias (3 to 30 lowercase letters/digits/hyphens).
- The UI obtains configured domains from public `GET /api/v1/links/domains`.
- Only when `ZRAIN_LINKS_SHORT_BASE_URL` is configured does a **Use a shorter link domain** option appear.
- Link creation stores `domain_variant` (`PRIMARY` or `SHORT`) in PostgreSQL via Flyway V2; old links default to `PRIMARY`.
- The short URL in API responses and QR codes points to its selected domain.
- Redirect checks the incoming server hostname against the stored variant. Unrelated hostnames cannot route to another link's destination.
- Aliases are globally unique across both origins: `claimmp` can exist only once. Legacy `/r/{code}` URLs remain supported on their original domain.
- If a second domain isn't configured, the API rejects requests asking for it and the UI hides its toggle.
- The JavaScript preview has been corrected to work outside the authentication dialog; it updates on alias/domain selection.

## DNS and hosting prerequisites (not deployed)
`zrain-links.web.app` and `zl.web.app` are **illustrative candidates only**, not active sites. Firebase Hosting site IDs must first be available and created under a Firebase project. Merely adding these strings to Java settings does not register those addresses.

Before enabling the shorter domain:
1. Control both hostname(s) through Firebase Hosting or another DNS/TLS host provider, and ensure both forward requests to the **same running Java backend**, preserving the correct original hostname.
2. Confirm HTTPS certificates and root-path routing work from a public browser for both hosts.
3. Set `ZRAIN_LINKS_BASE_URL=https://ACTUAL_PRIMARY_HOST` and `ZRAIN_LINKS_SHORT_BASE_URL=https://ACTUAL_SECONDARY_HOST`.
4. Apply Flyway V1 and V2 on persistent PostgreSQL and verify application startup.
5. Create links on each domain and test redirect, QR, duplicate aliases, deletion, existing `/r/{code}` URLs, and redirects requested on the wrong domain.
6. Enable the domain option only after the above is verified.

In local development, the primary URL can be `http://localhost:8081`; a secondary localhost alias is intentionally not assumed. Do not use `zrain-links.web.app` or `zl.web.app` in deployment settings until actual ownership and forwarding are confirmed.

**Public deployment is not finished:** no claim is made that a web.app site or a permanent domain has been registered. Public uptime and link longevity depend on the provider, domain renewals, durable database, backups, TLS and maintenance. A monitor such as UptimeRobot is an outage alert, not a hosting or permanence guarantee.
