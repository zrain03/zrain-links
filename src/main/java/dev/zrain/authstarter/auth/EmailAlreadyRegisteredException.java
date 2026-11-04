/**
 * Fail / File: src/main/java/dev/zrain/authstarter/auth/EmailAlreadyRegisteredException.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen EmailAlreadyRegisteredException; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of EmailAlreadyRegisteredException; API contracts preserved.
 */

package dev.zrain.authstarter.auth;

public class EmailAlreadyRegisteredException extends RuntimeException {
    public EmailAlreadyRegisteredException() {
        super("Email is already registered.");
    }
}
