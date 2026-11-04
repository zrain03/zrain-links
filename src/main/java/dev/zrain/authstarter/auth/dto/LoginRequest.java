/**
 * Fail / File: src/main/java/dev/zrain/authstarter/auth/dto/LoginRequest.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen LoginRequest; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of LoginRequest; API contracts preserved.
 */

package dev.zrain.authstarter.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
