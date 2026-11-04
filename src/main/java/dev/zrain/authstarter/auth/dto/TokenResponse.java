/**
 * Fail / File: src/main/java/dev/zrain/authstarter/auth/dto/TokenResponse.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen TokenResponse; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of TokenResponse; API contracts preserved.
 */

package dev.zrain.authstarter.auth.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}
