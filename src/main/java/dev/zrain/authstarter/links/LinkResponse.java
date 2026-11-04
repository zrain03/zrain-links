/**
 * Fail / File: src/main/java/dev/zrain/authstarter/links/LinkResponse.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen LinkResponse; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of LinkResponse; API contracts preserved.
 */

package dev.zrain.authstarter.links;

import java.time.Instant;
import java.util.UUID;

public record LinkResponse(UUID id, String code, String destinationUrl, String shortUrl,
                           long clickCount, Instant createdAt) {}
