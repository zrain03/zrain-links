/**
 * Fail / File: src/main/java/dev/zrain/authstarter/auth/AuthController.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen AuthController; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of AuthController; API contracts preserved.
 */


package dev.zrain.authstarter.auth;

import dev.zrain.authstarter.auth.dto.LoginRequest;
import dev.zrain.authstarter.auth.dto.RegisterRequest;
import dev.zrain.authstarter.auth.dto.TokenResponse;
import dev.zrain.authstarter.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;

    public AuthController(AuthService service) { this.service = service; }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registerUser(request));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return service.authenticate(request);
    }
}
