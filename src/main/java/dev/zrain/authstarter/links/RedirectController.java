/**
 * Fail / File: src/main/java/dev/zrain/authstarter/links/RedirectController.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen RedirectController; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of RedirectController; API contracts preserved.
 */

package dev.zrain.authstarter.links;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController
public class RedirectController {
    private final ShortLinkService service;
    public RedirectController(ShortLinkService service) { this.service = service; }

    @GetMapping({"/r/{code}", "/{code:[a-zA-Z0-9][a-zA-Z0-9-]{2,29}}"})
    public ResponseEntity<Void> redirect(@PathVariable String code, HttpServletRequest request) {
        if (!code.matches("[A-Za-z0-9][A-Za-z0-9-]{2,29}")) return ResponseEntity.notFound().build();
        String destination = service.destinationAndCountClick(code, request.getServerName());
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(destination))
                .header("Cache-Control", "no-store")
                .build();
    }
}