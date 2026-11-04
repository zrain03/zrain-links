/**
 * Fail / File: src/main/java/dev/zrain/authstarter/user/UserRepository.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Kod legacy Spring Boot bagi komponen UserRepository; kontrak API dipelihara.
 * EN: legacy Spring Boot implementation of UserRepository; API contracts preserved.
 */

package dev.zrain.authstarter.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmail(String email);
    boolean existsByEmail(String email);
}
