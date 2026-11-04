/**
 * Fail / File: src/main/java/dev/zrain/authstarter/user/UserController.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen UserController; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of UserController; API contracts preserved.
 */


package dev.zrain.authstarter.user;

import dev.zrain.authstarter.user.dto.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserRepository repository;

    public UserController(UserRepository repository) { this.repository = repository; }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid identity");
        }
        AppUser user = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable"));
        return UserResponse.from(user);
    }
}
