/**
 * Fail / File: src/main/java/dev/zrain/authstarter/links/ShortLinkRepository.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen ShortLinkRepository; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of ShortLinkRepository; API contracts preserved.
 */

package dev.zrain.authstarter.links;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShortLinkRepository extends JpaRepository<ShortLink, UUID> {
    Optional<ShortLink> findByCode(String code);
    boolean existsByCodeIgnoreCase(String code);
    List<ShortLink> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    Optional<ShortLink> findByIdAndOwnerId(UUID id, UUID ownerId);

    @Modifying
    @Query("update ShortLink l set l.clickCount = l.clickCount + 1 where l.id = :id")
    int incrementClicks(UUID id);
}