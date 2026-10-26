package dev.zrain.authstarter.common;

public record ApiError(int status, String code, String message, String path) {}
