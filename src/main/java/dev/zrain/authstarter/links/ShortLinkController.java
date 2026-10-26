package dev.zrain.authstarter.links;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/links")
public class ShortLinkController {
    private final ShortLinkService service;

    public ShortLinkController(ShortLinkService service) { this.service = service; }

    public record CreateLinkRequest(@NotBlank @Size(max = 2048) String destinationUrl, String customAlias) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LinkResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLinkRequest request) {
        return service.create(UUID.fromString(jwt.getSubject()), request.destinationUrl(), request.customAlias());
    }

    @GetMapping
    public List<LinkResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return service.mine(UUID.fromString(jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        service.delete(id, UUID.fromString(jwt.getSubject()));
    }
}