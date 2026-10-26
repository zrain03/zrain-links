package dev.zrain.authstarter.auth.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}
