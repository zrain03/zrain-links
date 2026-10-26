
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
