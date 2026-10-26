package dev.zrain.authstarter.links;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/links")
public class QrController {
    private final ShortLinkService service;
    public QrController(ShortLinkService service) { this.service = service; }

    @GetMapping(value = "/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        LinkResponse owned = service.mine(UUID.fromString(jwt.getSubject())).stream()
                .filter(link -> link.id().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found."));
        try {
            BitMatrix matrix = new MultiFormatWriter().encode(owned.shortUrl(), BarcodeFormat.QR_CODE, 320, 320);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(output.toByteArray());
        } catch (WriterException | IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "QR generation failed.");
        }
    }
}