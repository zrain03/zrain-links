package dev.zrain.authstarter.links;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController
public class RedirectController {
    private final ShortLinkService service;

    public RedirectController(ShortLinkService service) { this.service = service; }

    @GetMapping({"/r/{code}", "/{code:[a-zA-Z0-9][a-zA-Z0-9-]{2,29}}"})
    public ResponseEntity<Void> redirect(@PathVariable String code) {
        if (!code.matches("[A-Za-z0-9][A-Za-z0-9-]{2,29}")) return ResponseEntity.notFound().build();
        String destination = service.destinationAndCountClick(code);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(destination))
                .header("Cache-Control", "no-store")
                .build();
    }
}