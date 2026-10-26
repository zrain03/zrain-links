package dev.zrain.authstarter.auth;

import dev.zrain.authstarter.auth.dto.LoginRequest;
import dev.zrain.authstarter.auth.dto.RegisterRequest;
import dev.zrain.authstarter.auth.dto.TokenResponse;
import dev.zrain.authstarter.user.AppUser;
import dev.zrain.authstarter.user.Role;
import dev.zrain.authstarter.user.UserRepository;
import dev.zrain.authstarter.user.dto.UserResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository repository;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UserRepository repository, PasswordEncoder encoder, JwtService jwtService) {
        this.repository = repository;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public UserResponse registerUser(RegisterRequest request) {
        String email = normalize(request.email());
        if (repository.existsByEmail(email)) throw new EmailAlreadyRegisteredException();
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password must be 72 UTF-8 bytes or fewer.");
        }
        AppUser newUser = new AppUser(email, encoder.encode(request.password()), Role.USER);
        try {
            return UserResponse.from(repository.saveAndFlush(newUser));
        } catch (DataIntegrityViolationException exception) {
            if (repository.existsByEmail(email)) throw new EmailAlreadyRegisteredException();
            throw exception;
        }
    }

    public TokenResponse authenticate(LoginRequest request) {
        String email = normalize(request.email());
        AppUser user = repository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }
        return jwtService.generateAccessToken(user);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
