package dev.zrain.authstarter.links;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LinkDomainsTest {
    @Test
    void shortDomainOnlyAvailableWhenConfigured() {
        LinkDomains onlyPrimary = new LinkDomains("http://localhost:8080", "");
        assertFalse(onlyPrimary.shorterAvailable());
        assertEquals("http://localhost:8080", onlyPrimary.urlFor("PRIMARY"));

        LinkDomains both = new LinkDomains("https://links.example.com", "https://go.example.com");
        assertTrue(both.shorterAvailable());
        assertEquals("https://go.example.com", both.urlFor("SHORT"));
        assertTrue(both.matchesHost("SHORT", "go.example.com"));
        assertFalse(both.matchesHost("SHORT", "links.example.com"));
        assertFalse(both.matchesHost("PRIMARY", "go.example.com"));
    }

    @Test
    void rejectsInsecureOrConflictingDomainSettings() {
        assertThrows(IllegalArgumentException.class,
                () -> new LinkDomains("http://example.com", ""));
        assertThrows(IllegalArgumentException.class,
                () -> new LinkDomains("https://links.example.com", "https://links.example.com"));
        assertThrows(IllegalArgumentException.class,
                () -> new LinkDomains("https://links.example.com", "https://go.example.com/extra"));
    }
}
