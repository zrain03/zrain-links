/**
 * Fail / File: src/main/java/dev/zrain/authstarter/auth/dto/RegisterRequest.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen RegisterRequest; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of RegisterRequest; API contracts preserved.
 */


package dev.zrain.authstarter.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 72) String password
) {
    public RegisterRequest {
        if (email != null) email = email.trim();
    }
}
