package dev.zrain.authstarter.user.dto;

import dev.zrain.authstarter.user.AppUser;
import dev.zrain.authstarter.user.Role;
import java.util.UUID;

public record UserResponse(UUID id, String email, Role role) {
    public static UserResponse from(AppUser user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getRole());
    }
}
