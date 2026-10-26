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
    Optional<ShortLink> findByCodeAndCustomDomainIsNull(String code);
    Optional<ShortLink> findByCodeAndCustomDomain(String code, String customDomain);
    List<ShortLink> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    Optional<ShortLink> findByIdAndOwnerId(UUID id, UUID ownerId);
    boolean existsByCustomDomain(String customDomain);

    @Modifying
    @Query("update ShortLink l set l.clickCount = l.clickCount + 1 where l.id = :id")
    int incrementClicks(UUID id);
}