package dev.zrain.authstarter.integration;

import dev.zrain.authstarter.links.ShortLinkRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LinksIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JsonMapper mapper;
    @Autowired UserRepository users;
    @Autowired ShortLinkRepository links;

    @BeforeEach
    void clean() {
        links.deleteAll();
        users.deleteAll();
    }

    String login(String email) throws Exception {
        String body = mapper.writeValueAsString(
                new Registration(email, "VerySecurePassword123!"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isCreated());
        String response = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("accessToken").stringValue();
    }

    record Registration(String email, String password) {}

    @Test
    void authenticatedOwnerCanCreateRedirectListAndDownloadQr() throws Exception {
        String jwt = login("owner@example.com");

        String body = mvc.perform(post("/api/v1/links")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destinationUrl\":\"https://example.com/articles\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clickCount").value(0))
                .andReturn().getResponse().getContentAsString();

        String code = mapper.readTree(body).get("code").stringValue();
        String id = mapper.readTree(body).get("id").stringValue();

        mvc.perform(get("/r/" + code))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/articles"));

        mvc.perform(get("/api/v1/links").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].clickCount").value(1));

        mvc.perform(get("/api/v1/links/" + id + "/qr")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE));
    }

    @Test
    void privateLinksCannotBeManagedByOtherUsers() throws Exception {
        String owner = login("first@example.com");
        String other = login("second@example.com");
        String body = mvc.perform(post("/api/v1/links")
                .header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destinationUrl\":\"https://example.org\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = mapper.readTree(body).get("id").stringValue();

        mvc.perform(delete("/api/v1/links/" + id).header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/v1/links/" + id + "/qr").header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/links/" + id).header("Authorization", "Bearer " + owner))
                .andExpect(status().isNoContent());
    }

    @Test
    void anonymousCannotCreateAndUnsafeDestinationsAreRejected() throws Exception {
        mvc.perform(post("/api/v1/links").contentType(MediaType.APPLICATION_JSON)
                .content("{\"destinationUrl\":\"https://example.com\"}"))
                .andExpect(status().isUnauthorized());

        String jwt = login("safe@example.com");
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destinationUrl\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destinationUrl\":\"http://localhost:3000\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/r/missing00")).andExpect(status().isNotFound());
    }
}