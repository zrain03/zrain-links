/**
 * Fail / File: src/main/java/dev/zrain/authstarter/config/JwtProperties.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen JwtProperties; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of JwtProperties; API contracts preserved.
 */

package dev.zrain.authstarter.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zrain.jwt")
public record JwtProperties(String secretBase64, String issuer, String audience, long accessMinutes) {}
