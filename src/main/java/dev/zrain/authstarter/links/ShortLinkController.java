package dev.zrain.authstarter.links;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/links")
public class ShortLinkController {
    private final ShortLinkService service;
    private final LinkDomains domains;

    public ShortLinkController(ShortLinkService service, LinkDomains domains) {
        this.service = service;
        this.domains = domains;
    }

    public record CreateLinkRequest(@NotBlank @Size(max=2048) String destinationUrl,
                                    String customAlias, Boolean useShortDomain) {}

    @GetMapping("/domains")
    public Map<String, Object> domains() {
        return Map.of("primary", domains.primary(),
                "shortAvailable", domains.shorterAvailable(),
                "shortDomain", domains.shorterAvailable() ? domains.shorter() : "");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LinkResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLinkRequest request) {
        return service.create(UUID.fromString(jwt.getSubject()), request.destinationUrl(),
                request.customAlias(), Boolean.TRUE.equals(request.useShortDomain()));
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