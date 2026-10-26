
package dev.zrain.authstarter.config;

import dev.zrain.authstarter.auth.JwtService;
import dev.zrain.authstarter.user.AppUser;
import dev.zrain.authstarter.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private final JwtConfig config = new JwtConfig();
    private final JwtProperties properties = new JwtProperties(
            "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=", "issuer", "audience", 15);

    @Test
    void tokenContainsExpectedClaims() {
        var key = config.jwtSigningKey(properties);
        var service = new JwtService(config.jwtEncoder(key), properties);
        JwtDecoder decoder = config.jwtDecoder(key, properties);
        var user = new AppUser("test@example.com", "hash", Role.USER);
        UUID id = UUID.randomUUID();
        ReflectionTestUtils.setField(user, "id", id);

        var token = service.generateAccessToken(user);
        var decoded = decoder.decode(token.accessToken());

        assertEquals("Bearer", token.tokenType());
        assertEquals(900, token.expiresIn());
        assertEquals(id.toString(), decoded.getSubject());
        assertEquals("issuer", decoded.getClaimAsString("iss"));
        assertEquals("USER", decoded.getClaimAsStringList("roles").getFirst());
    }

    @Test
    void shortSecretMustFail() {
        var bad = new JwtProperties("c2hvcnQ=", "issuer", "audience", 15);
        assertThrows(IllegalStateException.class, () -> config.jwtSigningKey(bad));
    }
    @Test
    void missingSecretMustFail() {
        var missing = new JwtProperties("", "issuer", "audience", 15);
        assertThrows(IllegalStateException.class, () -> config.jwtSigningKey(missing));
    }

    @Test
    void invalidJwtSettingsMustFail() {
        var invalid = new JwtProperties(properties.secretBase64(), "issuer", "audience", 0);
        assertThrows(IllegalStateException.class, () -> config.jwtSigningKey(invalid));
    }

}
