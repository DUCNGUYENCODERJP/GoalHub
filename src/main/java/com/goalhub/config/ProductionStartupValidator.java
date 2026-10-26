package com.goalhub.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates that all required environment variables are present before the application
 * finishes starting in the {@code prod} profile.
 *
 * <p><b>Two-layer fail-fast strategy:</b>
 * <ol>
 *   <li><b>Layer 1 — Spring placeholder resolution</b>: {@code application-prod.yml}
 *       uses bare {@code ${VAR}} placeholders (no defaults). Spring itself throws
 *       {@code IllegalArgumentException} before any bean initialises if a variable
 *       is missing.</li>
 *   <li><b>Layer 2 — This validator</b>: Runs {@code @PostConstruct} with an explicit
 *       check that produces a clear, human-readable error listing every missing
 *       variable at once, so operators know exactly what to fix.</li>
 * </ol>
 *
 * <p>This bean is <em>only</em> instantiated when the {@code prod} Spring profile is
 * active ({@code SPRING_PROFILES_ACTIVE=prod}).
 */
@Component
@Profile("prod")
public class ProductionStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(ProductionStartupValidator.class);

    /** Minimum acceptable length for JWT_SECRET (256 bits = 64 hex chars). */
    private static final int JWT_SECRET_MIN_LENGTH = 64;

    @PostConstruct
    public void validateRequiredSecrets() {
        log.info("=== [PROD] Validating required environment variables ===");

        List<String> errors = new ArrayList<>();

        // ── Required DB credentials ──────────────────────────────────────────
        requireEnvVar("DB_URL",      "JDBC connection string to production MySQL", errors);
        requireEnvVar("DB_USERNAME", "Database username",                           errors);
        requireEnvVar("DB_PASSWORD", "Database password (must be rotated from dev)", errors);

        // ── Required JWT secret ──────────────────────────────────────────────
        String jwtSecret = System.getenv("JWT_SECRET");
        if (jwtSecret == null || jwtSecret.isBlank()) {
            errors.add("JWT_SECRET is not set. Provide a cryptographically random hex string "
                    + "(min " + JWT_SECRET_MIN_LENGTH + " chars / 256 bits).");
        } else if (jwtSecret.length() < JWT_SECRET_MIN_LENGTH) {
            errors.add("JWT_SECRET is too short: " + jwtSecret.length() + " chars. "
                    + "Minimum required: " + JWT_SECRET_MIN_LENGTH
                    + " chars (256 bits). Generate with: openssl rand -hex 32");
        }

        if (!errors.isEmpty()) {
            String message = buildErrorMessage(errors);
            log.error(message);
            throw new IllegalStateException(message);
        }

        log.info("=== [PROD] All required environment variables are present. Startup continues. ===");
    }

    private void requireEnvVar(String name, String description, List<String> errors) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            errors.add(name + " is not set. " + description + ".");
        }
    }

    private String buildErrorMessage(List<String> errors) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n\n");
        sb.append("╔══════════════════════════════════════════════════════════════════╗\n");
        sb.append("║   STARTUP ABORTED — Missing required production environment vars  ║\n");
        sb.append("╠══════════════════════════════════════════════════════════════════╣\n");
        for (int i = 0; i < errors.size(); i++) {
            sb.append(String.format("║  %d. %-63s║\n", i + 1, errors.get(i)));
        }
        sb.append("╠══════════════════════════════════════════════════════════════════╣\n");
        sb.append("║  Set the above env vars before starting with --spring.profiles   ║\n");
        sb.append("║  .active=prod, or use SPRING_PROFILES_ACTIVE=prod in the shell.  ║\n");
        sb.append("╚══════════════════════════════════════════════════════════════════╝\n");
        return sb.toString();
    }
}
