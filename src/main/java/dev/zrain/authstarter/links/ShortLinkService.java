package dev.zrain.authstarter.links;

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
    private final LinkDomains domains;

    public ShortLinkService(ShortLinkRepository links, LinkDomains domains) {
        this.links = links;
        this.domains = domains;
    }

    public LinkResponse create(UUID ownerId, String destinationUrl) {
        return create(ownerId, destinationUrl, null, false);
    }

    public LinkResponse create(UUID ownerId, String destinationUrl, String alias) {
        return create(ownerId, destinationUrl, alias, false);
    }

    @Transactional
    public LinkResponse create(UUID ownerId, String destinationUrl, String alias, boolean useShortDomain) {
        String destination = validateDestination(destinationUrl);
        if (useShortDomain && !domains.shorterAvailable()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The shorter domain is not available.");
        }
        String variant = useShortDomain ? "SHORT" : "PRIMARY";
        boolean custom = alias != null && !alias.isBlank();
        String code = custom ? validateAlias(alias) : randomCode();
        if (custom && links.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This link name is already taken.");
        }
        try {
            return toResponse(links.saveAndFlush(new ShortLink(ownerId, code, destination, variant)));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This link name is already taken. Try another.");
        }
    }

    static String validateAlias(String value) {
        String alias = value.trim();
        if (!alias.matches("[a-z0-9][a-z0-9-]{2,29}") || alias.endsWith("-")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use 3-30 lowercase letters, numbers or hyphens. No trailing hyphen.");
        }
        if (List.of("api","r","admin","auth","login","logout","signup","signin",
                "register","assets","static","docs","swagger-ui","actuator",
                "favicon","index","app","robots","health","help","terms","privacy",
                "dashboard","links","my-links","account","settings","support").contains(alias)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This link name is reserved.");
        }
        return alias;
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
        return destinationAndCountClick(code, URI.create(domains.primary()).getHost());
    }

    @Transactional
    public String destinationAndCountClick(String code, String requestHost) {
        ShortLink link = links.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found."));
        if (!domains.matchesHost(link.getDomainVariant(), requestHost)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found on this domain.");
        }
        links.incrementClicks(link.getId());
        return link.getDestinationUrl();
    }

    private LinkResponse toResponse(ShortLink link) {
        return new LinkResponse(link.getId(), link.getCode(), link.getDestinationUrl(),
                domains.urlFor(link.getDomainVariant()) + "/" + link.getCode(),
                link.getClickCount(), link.getCreatedAt());
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