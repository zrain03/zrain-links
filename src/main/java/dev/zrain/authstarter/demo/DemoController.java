/**
 * Fail / File: src/main/java/dev/zrain/authstarter/demo/DemoController.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen DemoController; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of DemoController; API contracts preserved.
 */

package dev.zrain.authstarter.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/demo")
public class DemoController {
    @GetMapping("/public")
    public Map<String, String> publicEndpoint() { return Map.of("message", "Public endpoint works."); }

    @GetMapping("/protected")
    public Map<String, String> protectedEndpoint() { return Map.of("message", "JWT is valid."); }

    @GetMapping("/admin")
    public Map<String, String> adminEndpoint() { return Map.of("message", "ADMIN role is permitted."); }
}
