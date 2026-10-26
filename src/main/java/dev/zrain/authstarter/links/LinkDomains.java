package dev.zrain.authstarter.links;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;

@Component
public class LinkDomains {
    private final URI primary;
    private final URI shorter;

    public LinkDomains(@Value("${zrain-links.base-url}") String primaryUrl,
                       @Value("${zrain-links.short-base-url:}") String shorterUrl) {
        this.primary = validate(primaryUrl, "ZRAIN_LINKS_BASE_URL");
        this.shorter = shorterUrl == null || shorterUrl.isBlank()
                ? null : validate(shorterUrl, "ZRAIN_LINKS_SHORT_BASE_URL");
        if (shorter != null && primary.getHost().equalsIgnoreCase(shorter.getHost())) {
            throw new IllegalArgumentException("The short link domain must use a different hostname.");
        }
    }

    private static URI validate(String value, String name) {
        try {
            URI uri = URI.create(value.strip());
            if (!uri.isAbsolute() || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getQuery() != null || uri.getFragment() != null
                    || (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !"/".equals(uri.getRawPath()))
                    || !("https".equals(uri.getScheme())
                       || ("http".equals(uri.getScheme()) && "localhost".equalsIgnoreCase(uri.getHost())))) {
                throw new IllegalArgumentException("Invalid domain");
            }
            return URI.create(uri.toString().replaceAll("/+$", ""));
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException(name + " must be an absolute HTTPS URL (localhost HTTP is allowed).", ex);
        }
    }

    public String primary() {
        return primary.toString();
    }

    public String shorter() {
        return shorter == null ? null : shorter.toString();
    }

    public boolean shorterAvailable() {
        return shorter != null;
    }

    public String urlFor(String variant) {
        return "SHORT".equals(variant) && shorter != null ? shorter() : primary();
    }

    public boolean matchesHost(String variant, String requestHost) {
        URI chosen = "SHORT".equals(variant) ? shorter : primary;
        return chosen != null && requestHost != null
                && chosen.getHost().toLowerCase(Locale.ROOT).equals(requestHost.toLowerCase(Locale.ROOT));
    }
}