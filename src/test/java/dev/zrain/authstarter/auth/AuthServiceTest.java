
package dev.zrain.authstarter.auth;

import dev.zrain.authstarter.auth.dto.LoginRequest;
import dev.zrain.authstarter.auth.dto.RegisterRequest;
import dev.zrain.authstarter.auth.dto.TokenResponse;
import dev.zrain.authstarter.user.AppUser;
import dev.zrain.authstarter.user.Role;
import dev.zrain.authstarter.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository repository;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwtService;
    @InjectMocks AuthService service;

    @Test
    void registerNormalizesEmailAndHashesPassword() {
        when(encoder.encode("A-Long-Passphrase!123")).thenReturn("{bcrypt}hash");
        when(repository.saveAndFlush(any(AppUser.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = service.registerUser(
                new RegisterRequest("  TEST@Example.com  ", "A-Long-Passphrase!123"));

        assertEquals("test@example.com", result.email());
        assertEquals(Role.USER, result.role());

        verify(repository).saveAndFlush(argThat(u ->
                u.getPasswordHash().equals("{bcrypt}hash")
                && u.getRole() == Role.USER));
    }

    @Test
    void rejectDuplicateEmail() {
        when(repository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(EmailAlreadyRegisteredException.class,
                () -> service.registerUser(
                        new RegisterRequest("TEST@example.com", "A-Long-Passphrase!123")));

        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void rejectPasswordOver72Utf8Bytes() {
        assertThrows(IllegalArgumentException.class,
                () -> service.registerUser(
                        new RegisterRequest("test@example.com", "😀".repeat(19))));
    }

    @Test
    void loginCorrectPasswordCreatesToken() {
        AppUser user = new AppUser("test@example.com", "hash", Role.USER);

        when(repository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(user));
        when(encoder.matches("correct-password", "hash"))
                .thenReturn(true);
        when(jwtService.generateAccessToken(user))
                .thenReturn(new TokenResponse("jwt", "Bearer", 900));

        assertEquals("jwt",
                service.authenticate(
                        new LoginRequest("TEST@EXAMPLE.COM", "correct-password"))
                        .accessToken());
    }

    @Test
    void loginWrongPasswordIsRejected() {
        AppUser user = new AppUser("test@example.com", "hash", Role.USER);

        when(repository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(user));

        assertThrows(BadCredentialsException.class,
                () -> service.authenticate(
                        new LoginRequest("test@example.com", "wrong")));
    }

    @Test
    void unknownUserIsRejected() {
        assertThrows(BadCredentialsException.class,
                () -> service.authenticate(
                        new LoginRequest("unknown@example.com", "password")));
    }
}
