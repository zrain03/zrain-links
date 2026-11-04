/**
 * Fail / File: src/test/java/dev/zrain/authstarter/user/UserRepositoryTest.java
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Ujian regresi Java untuk UserRepositoryTest.
 * EN: Java regression tests for UserRepositoryTest.
 */

package dev.zrain.authstarter.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class UserRepositoryTest {
    @Autowired UserRepository repository;

    @Test
    void findByEmailAndEnforceUniqueConstraint() {
        repository.saveAndFlush(new AppUser("test@example.com", "hash", Role.USER));
        assertTrue(repository.findByEmail("test@example.com").isPresent());
        assertThrows(DataIntegrityViolationException.class, () ->
                repository.saveAndFlush(new AppUser("test@example.com", "another", Role.USER)));
    }
}
