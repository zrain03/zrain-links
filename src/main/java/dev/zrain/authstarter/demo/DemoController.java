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
