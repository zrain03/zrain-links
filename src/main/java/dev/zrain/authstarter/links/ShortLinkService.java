package dev.zrain.authstarter.links;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ShortLinkService {
    private static final String ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final ShortLinkRepository links;
    private final String baseUrl;

    public ShortLinkService(ShortLinkRepository links, @Value("${zrain-links.base-url}") String baseUrl) {
        this.links = links;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @Transactional
    public LinkResponse create(UUID ownerId, String destinationUrl) {
        String destination = validateDestination(destinationUrl);
        for (int attempt = 0; attempt < 8; attempt++) {
            String code = randomCode();
            try {
                return toResponse(links.saveAndFlush(new ShortLink(ownerId, code, destination)));
            } catch (DataIntegrityViolationException ex) {
                if (links.findByCode(code).isEmpty()) throw ex;
            }
        }
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Could not generate a unique link.");
    }

    @Transactional(readOnly = true)
    public List<LinkResponse> mine(UUID ownerId) {
        return links.findByOwnerIdOrderByCreatedAtDesc(ownerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(UUID id, UUID ownerId) {
        ShortLink link = links.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found."));
        links.delete(link);
    }

    @Transactional
    public String destinationAndCountClick(String code) {
        ShortLink link = links.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found."));
        links.incrementClicks(link.getId());
        return link.getDestinationUrl();
    }

    private LinkResponse toResponse(ShortLink link) {
        return new LinkResponse(link.getId(), link.getCode(), link.getDestinationUrl(),
                baseUrl + "/r/" + link.getCode(), link.getClickCount(), link.getCreatedAt());
    }

    static String validateDestination(String input) {
        if (input == null || input.isBlank() || input.length() > 2048) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid destination URL.");
        }
        try {
            URI uri = new URI(input.trim());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || host.isBlank()
                    || uri.getUserInfo() != null || uri.getFragment() != null
                    || host.equalsIgnoreCase("localhost") || host.endsWith(".localhost")
                    || host.equals("0.0.0.0") || host.matches("[0-9.]+")
                    || host.indexOf(':') >= 0 || host.toLowerCase(Locale.ROOT).endsWith(".local")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a public HTTPS destination.");
            }
            return uri.toASCIIString();
        } catch (URISyntaxException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid HTTPS URL.");
        }
    }

    private static String randomCode() {
        StringBuilder code = new StringBuilder(9);
        for (int i = 0; i < 9; i++) code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return code.toString();
    }
}