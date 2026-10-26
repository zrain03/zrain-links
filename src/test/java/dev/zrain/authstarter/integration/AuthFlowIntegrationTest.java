
package dev.zrain.authstarter.integration;

import dev.zrain.authstarter.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository repository;
    @Autowired JsonMapper mapper;

    @BeforeEach
    void clean() {
        repository.deleteAll();
    }

    @Test
    void registerLoginAndAccessMe() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"  Sample@Example.com  ","password":"VerySecurePassword123!"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("sample@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        assertNotEquals("VerySecurePassword123!",
                repository.findByEmail("sample@example.com")
                        .orElseThrow().getPasswordHash());

        String body = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"sample@example.com","password":"VerySecurePassword123!"}
                        """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = mapper.readTree(body)
                .get("accessToken").stringValue();

        mvc.perform(get("/api/v1/users/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("sample@example.com"));

        mvc.perform(get("/api/v1/demo/admin")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerDuplicateAndInvalidBody() throws Exception {
        String request = """
                {"email":"test@example.com","password":"VerySecurePassword123!"}
                """;

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"not-an-email\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginWrongPasswordIsGeneric401() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@example.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
    @Test
    void deletedAccountCannotAccessMeWithOldToken() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"removed@example.com","password":"VerySecurePassword123!"}
                        """))
                .andExpect(status().isCreated());

        String loginBody = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"removed@example.com","password":"VerySecurePassword123!"}
                        """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = mapper.readTree(loginBody).get("accessToken").stringValue();

        repository.deleteAll();

        mvc.perform(get("/api/v1/users/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

}
