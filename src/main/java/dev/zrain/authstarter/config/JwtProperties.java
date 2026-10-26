package dev.zrain.authstarter.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zrain.jwt")
public record JwtProperties(String secretBase64, String issuer, String audience, long accessMinutes) {}
