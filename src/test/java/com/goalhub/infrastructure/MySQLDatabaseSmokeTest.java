package com.goalhub.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bước 4: Test cơ sở chứng minh kiểm thử chạy trên MySQL thật (InnoDB), KHÔNG phải H2.
 *
 * Lý do KHÔNG dùng H2 để test concurrency:
 * 1. Cơ chế khóa: H2 in-memory (kể cả MODE=MySQL) sử dụng table-level locking hoặc row-level lock
 *    với cơ chế đơn giản, không mô phỏng đúng InnoDB Next-Key Locking, Gap Locking, MVCC (Multi-Version
 *    Concurrency Control) và Repeatable Read isolation level của MySQL.
 * 2. Tái hiện race condition / deadlock: H2 không tái hiện được deadlock thật giữa các transactions
 *    đồng thời khi tranh chấp khóa hàng (row lock) hoặc lock wait timeout trong điều kiện high load.
 * 3. Chuẩn bị cho Bước 5: Test tải đặt trùng ghế (Pessimistic / Optimistic Locking) bắt buộc phải
 *    chạy trên MySQL thật để đảm bảo kết quả chính xác 100% như môi trường Production.
 *
 * Testcontainers với `disabledWithoutDocker = true` cho phép:
 * - Chạy container MySQL 8.0 thật khi Docker daemon đang bật.
 * - Tự động bỏ qua (skip) test này nếu môi trường dev chưa khởi động Docker daemon,
 *   giúp các unit/slice tests H2 khác vẫn luôn pass an toàn.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
public class MySQLDatabaseSmokeTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("goalhub_test")
            .withUsername("test")
            .withPassword("test");

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("BƯỚC 4: Xác minh kết nối cơ sở dữ liệu là MySQL thật và KHÔNG PHẢI H2")
    void verifyRunningOnRealMySQLNotH2() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String productName = metaData.getDatabaseProductName();
            String productVersion = metaData.getDatabaseProductVersion();
            String driverName = metaData.getDriverName();

            // 1. Phải là MySQL, tuyệt đối không phải H2
            assertThat(productName)
                    .as("Cơ sở dữ liệu phải là MySQL")
                    .isEqualToIgnoringCase("MySQL");

            assertThat(productName)
                    .as("Không được là H2 in-memory")
                    .doesNotContainIgnoringCase("H2");

            assertThat(driverName)
                    .as("Driver phải là MySQL Connector/J")
                    .containsIgnoringCase("MySQL");

            // 2. Kiểm tra truy vấn hệ thống đặc trưng của MySQL
            String versionQuery = jdbcTemplate.queryForObject("SELECT VERSION()", String.class);
            assertThat(versionQuery).isNotBlank();

            // 3. Kiểm tra engine InnoDB mặc định
            String defaultEngine = jdbcTemplate.queryForObject(
                    "SELECT @@default_storage_engine", String.class);
            assertThat(defaultEngine).isEqualToIgnoringCase("InnoDB");

            System.out.println("==================================================");
            System.out.println(" [BƯỚC 4] XÁC MINH THÀNH CÔNG: ĐANG CHẠY TRÊN MYSQL THẬT");
            System.out.println(" Database: " + productName + " (Version: " + productVersion + ")");
            System.out.println(" Driver: " + driverName);
            System.out.println(" Default Storage Engine: " + defaultEngine);
            System.out.println("==================================================");
        }
    }
}
