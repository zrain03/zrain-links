package dev.zrain.authstarter.links;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "short_links", indexes = @Index(name = "idx_short_links_owner", columnList = "owner_id"))
public class ShortLink {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    @Column(nullable = false, unique = true, length = 30)
    private String code;
    @Column(name = "destination_url", nullable = false, length = 2048)
    private String destinationUrl;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "click_count", nullable = false)
    private long clickCount;
    @Column(name = "domain_variant", nullable = false, length = 10)
    private String domainVariant = "PRIMARY";

    protected ShortLink() {}
    public ShortLink(UUID ownerId, String code, String destinationUrl) {
        this(ownerId, code, destinationUrl, "PRIMARY");
    }
    public ShortLink(UUID ownerId, String code, String destinationUrl, String domainVariant) {
        this.ownerId = ownerId;
        this.code = code;
        this.destinationUrl = destinationUrl;
        this.domainVariant = domainVariant;
        this.createdAt = Instant.now();
    }
    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getCode() { return code; }
    public String getDestinationUrl() { return destinationUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public long getClickCount() { return clickCount; }
    public String getDomainVariant() { return domainVariant; }
}