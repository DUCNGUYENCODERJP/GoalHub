package com.goalhub.order;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Shared MySQL Testcontainer base for all concurrency integration tests.
 *
 * <p>A single MySQL 8.0 container is started once per JVM run (static field).
 * All subclasses reuse this container — no password is hardcoded anywhere.
 * HikariCP pool settings (maximum-pool-size=50) are injected via
 * {@link DynamicPropertySource} so the benchmark numbers remain comparable
 * to the previous results that used pool=50.
 *
 * <p>Tests are automatically skipped when Docker is unavailable (Testcontainers
 * behaviour when no Docker daemon is running).
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
public abstract class MySQLContainerBase {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("goalhub_concurrency_test")
            .withUsername("test")
            .withPassword("test")
            // Matches production charset config from docker-compose.yml
            .withCommand(
                "--character-set-server=utf8mb4",
                "--collation-server=utf8mb4_unicode_ci"
            );

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        // Pool size matches benchmark configuration documented in docs/concurrency-benchmark.md
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "50");
        registry.add("spring.datasource.hikari.minimum-idle", () -> "10");
        registry.add("spring.datasource.hikari.connection-timeout", () -> "30000");
        registry.add("spring.jpa.properties.hibernate.dialect",
                () -> "org.hibernate.dialect.MySQLDialect");
        registry.add("spring.jpa.show-sql", () -> "false");
    }
}
