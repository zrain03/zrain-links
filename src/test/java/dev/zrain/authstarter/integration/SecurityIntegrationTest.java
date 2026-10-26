
package dev.zrain.authstarter.integration;

import dev.zrain.authstarter.config.JwtProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtEncoder encoder;
    @Autowired JwtProperties properties;

    private String token(String audience, Instant expiry, String role) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(UUID.randomUUID().toString())
                .audience(List.of(audience))
                .issuedAt(Instant.now().minusSeconds(300))
                .expiresAt(expiry)
                .claim("roles", List.of(role))
                .build();

        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    @Test
    void publicWorksAndProtectedRejectsMissingToken() throws Exception {
        mvc.perform(get("/api/v1/demo/public"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/demo/protected"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectWrongAudienceAndExpiredToken() throws Exception {
        String wrongAudience = token(
                "another-api", Instant.now().plusSeconds(600), "USER");

        String expired = token(
                properties.audience(), Instant.now().minusSeconds(120), "USER");

        mvc.perform(get("/api/v1/demo/protected")
                .header("Authorization", "Bearer " + wrongAudience))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/demo/protected")
                .header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRoleControlsAccess() throws Exception {
        String normal = token(
                properties.audience(), Instant.now().plusSeconds(600), "USER");

        String admin = token(
                properties.audience(), Instant.now().plusSeconds(600), "ADMIN");

        mvc.perform(get("/api/v1/demo/admin")
                .header("Authorization", "Bearer " + normal))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/demo/admin")
                .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
    }
    @Test
    void rejectWrongIssuerEvenWithValidSignature() throws Exception {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("unknown-issuer")
                .subject(UUID.randomUUID().toString())
                .audience(List.of(properties.audience()))
                .issuedAt(Instant.now().minusSeconds(60))
                .expiresAt(Instant.now().plusSeconds(600))
                .claim("roles", List.of("ADMIN"))
                .build();
        String jwt = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mvc.perform(get("/api/v1/demo/admin")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectMalformedBearerToken() throws Exception {
        mvc.perform(get("/api/v1/demo/protected")
                .header("Authorization", "Bearer not-a-valid-jwt"))
                .andExpect(status().isUnauthorized());
    }

}
