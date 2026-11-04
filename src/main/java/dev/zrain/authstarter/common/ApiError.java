/**
 * Fail / File: src/main/java/dev/zrain/authstarter/common/ApiError.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen ApiError; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of ApiError; API contracts preserved.
 */

package dev.zrain.authstarter.common;

public record ApiError(int status, String code, String message, String path) {}
