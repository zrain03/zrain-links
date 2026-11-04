/**
 * Fail / File: src/main/java/dev/zrain/authstarter/user/dto/UserResponse.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen UserResponse; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of UserResponse; API contracts preserved.
 */

package dev.zrain.authstarter.user.dto;

import dev.zrain.authstarter.user.AppUser;
import dev.zrain.authstarter.user.Role;
import java.util.UUID;

public record UserResponse(UUID id, String email, Role role) {
    public static UserResponse from(AppUser user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getRole());
    }
}
