/**
 * Fail / File: src/main/java/dev/zrain/authstarter/AuthStarterApplication.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen AuthStarterApplication; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of AuthStarterApplication; API contracts preserved.
 */

package dev.zrain.authstarter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AuthStarterApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthStarterApplication.class, args);
    }
}
