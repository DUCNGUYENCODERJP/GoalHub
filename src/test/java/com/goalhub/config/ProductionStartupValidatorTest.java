package com.goalhub.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import uk.org.webcompere.systemstubs.environment.EnvironmentVariables;
import uk.org.webcompere.systemstubs.jupiter.SystemStub;
import uk.org.webcompere.systemstubs.jupiter.SystemStubsExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;

/**
 * Unit tests for {@link ProductionStartupValidator}.
 *
 * Uses system-stubs to set/clear environment variables without forking a process.
 * These tests do NOT start a Spring context — they test the validator logic directly.
 */
@ExtendWith(SystemStubsExtension.class)
@DisplayName("ProductionStartupValidator — fail-fast on missing env vars")
class ProductionStartupValidatorTest {

    @SystemStub
    private EnvironmentVariables env;

    private final ProductionStartupValidator validator = new ProductionStartupValidator();

    // ─── Passes when all required vars are present ───────────────────────────

    @Test
    @DisplayName("does NOT throw when all required env vars are present and JWT_SECRET is long enough")
    void passes_whenAllVarsPresent() {
        env.set("DB_URL",      "jdbc:mysql://localhost:3306/goalhub")
           .set("DB_USERNAME", "goalhub_user")
           .set("DB_PASSWORD", "super-secret-prod-password")
           .set("JWT_SECRET",  "a".repeat(64)); // exactly 64 chars

        assertThatNoException().isThrownBy(validator::validateRequiredSecrets);
    }

    // ─── Fails when any required var is missing ──────────────────────────────

    @Test
    @DisplayName("throws IllegalStateException when DB_PASSWORD is missing")
    void fails_whenDbPasswordMissing() {
        env.set("DB_URL",      "jdbc:mysql://localhost:3306/goalhub")
           .set("DB_USERNAME", "goalhub_user")
           // DB_PASSWORD intentionally not set
           .set("JWT_SECRET",  "a".repeat(64));

        assertThatThrownBy(validator::validateRequiredSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB_PASSWORD");
    }

    @Test
    @DisplayName("throws IllegalStateException when JWT_SECRET is missing")
    void fails_whenJwtSecretMissing() {
        env.set("DB_URL",      "jdbc:mysql://localhost:3306/goalhub")
           .set("DB_USERNAME", "goalhub_user")
           .set("DB_PASSWORD", "super-secret-prod-password");
        // JWT_SECRET intentionally not set

        assertThatThrownBy(validator::validateRequiredSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    @DisplayName("throws IllegalStateException when JWT_SECRET is shorter than 64 chars")
    void fails_whenJwtSecretTooShort() {
        env.set("DB_URL",      "jdbc:mysql://localhost:3306/goalhub")
           .set("DB_USERNAME", "goalhub_user")
           .set("DB_PASSWORD", "super-secret-prod-password")
           .set("JWT_SECRET",  "short"); // too short

        assertThatThrownBy(validator::validateRequiredSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET is too short");
    }

    @Test
    @DisplayName("throws IllegalStateException listing ALL missing vars at once (not just the first)")
    void fails_listingAllMissingVarsAtOnce() {
        // All required vars missing
        assertThatThrownBy(validator::validateRequiredSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB_URL")
                .hasMessageContaining("DB_USERNAME")
                .hasMessageContaining("DB_PASSWORD")
                .hasMessageContaining("JWT_SECRET");
    }
}
