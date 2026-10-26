package dev.zrain.authstarter.links;

import java.time.Instant;
import java.util.UUID;

public record LinkResponse(UUID id, String code, String destinationUrl, String shortUrl,
                           long clickCount, Instant createdAt) {}
