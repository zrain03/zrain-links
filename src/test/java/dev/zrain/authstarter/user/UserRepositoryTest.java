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
