package com.goalhub.order;

import com.goalhub.exception.BusinessException;
import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.match.MatchStatus;
import com.goalhub.order.dto.OrderRequest;
import com.goalhub.order.dto.OrderResponse;
import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatRepository;
import com.goalhub.seat.SeatStatus;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BƯỚC 5 — GIAI ĐOẠN A: Integration Test chứng minh lỗi tranh chấp ghế (Concurrency Race Condition).
 *
 * Môi trường:
 * - Chạy trên MySQL thật (InnoDB), TUYỆT ĐỐI KHÔNG DÙNG H2.
 * - HikariCP Connection Pool: maximum-pool-size = 50, minimum-idle = 10, connection-timeout = 30000ms.
 * - Mỗi luồng sử dụng một User riêng biệt và kích hoạt transaction độc lập qua OrderService.createOrder.
 * - Sử dụng CountDownLatch (readyLatch + startLatch) để tất cả N luồng xuất phát đồng thời 100%.
 */
public class SeatContentionTest extends MySQLContainerBase {

    @Autowired
    private OrderService orderService;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Giai đoạn A: N người dùng đồng thời tranh nhau đặt 1 ghế (Kỳ vọng: PHẢI FAIL khi chưa có lock)")
    void testConcurrentSeatBookingRaceCondition() throws InterruptedException {
        int concurrentUsers = Integer.getInteger("test.concurrency.n", 100);
        int threadPoolSize = Math.min(concurrentUsers, 50);

        System.out.println("=========================================================================================");
        System.out.println(" [GIAI ĐOẠN A] BẮT ĐẦU CHẠY SEAT CONTENTION TEST TRÊN MYSQL THẬT");
        System.out.println(" Số luồng người dùng đồng thời (N): " + concurrentUsers);
        System.out.println(" Kích thước ThreadPool thực thi:    " + threadPoolSize);
        System.out.println(" Cấu hình Hikari Connection Pool:    max-pool-size=50, timeout=30000ms");
        System.out.println("=========================================================================================");

        // 1. Chuẩn bị dữ liệu sạch trong DB
        // Dọn dẹp các đơn hàng test cũ nếu có
        jdbcTemplate.execute("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE match_id >= 90000)");
        jdbcTemplate.execute("DELETE FROM orders WHERE match_id >= 90000");
        jdbcTemplate.execute("DELETE FROM seats WHERE match_id >= 90000");
        jdbcTemplate.execute("DELETE FROM matches WHERE id >= 90000");

        // Tạo trận đấu mới
        int initialAvailableSeats = 100;
        Match match = Match.builder()
                .homeTeam("Vietnam National Team")
                .awayTeam("Thailand National Team")
                .venue("My Dinh National Stadium")
                .matchDate(LocalDateTime.now().plusDays(7))
                .status(MatchStatus.UPCOMING)
                .ticketPrice(BigDecimal.valueOf(200000))
                .totalSeats(100)
                .availableSeats(initialAvailableSeats)
                .build();
        match = matchRepository.saveAndFlush(match);
        final Long matchId = match.getId();

        // Tạo 1 ghế duy nhất ở trạng thái AVAILABLE
        Seat seat = Seat.builder()
                .match(match)
                .seatCode("HOT-SEAT-01")
                .seatClass(SeatClass.VIP)
                .price(BigDecimal.valueOf(200000))
                .status(SeatStatus.AVAILABLE)
                .version(0L)
                .build();
        seat = seatRepository.saveAndFlush(seat);
        final Long seatId = seat.getId();

        // Tạo N người dùng khác nhau trong DB
        List<User> users = new ArrayList<>(concurrentUsers);
        for (int i = 1; i <= concurrentUsers; i++) {
            final int userIndex = i;
            final String email = "contender_" + userIndex + "@concurrency-test.vn";
            Optional<User> existing = userRepository.findByEmail(email);
            User user = existing.orElseGet(() -> userRepository.save(User.builder()
                    .email(email)
                    .fullName("Contender " + userIndex)
                    .role(Role.USER)
                    .password("$2a$10$abcdefghijklmnopqrstuv")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build()));
            users.add(user);
        }

        // 2. Thiết lập cơ chế xuất phát đồng thời (Barrier / Latch)
        ExecutorService executor = Executors.newFixedThreadPool(threadPoolSize);
        CountDownLatch readyLatch = new CountDownLatch(concurrentUsers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(concurrentUsers);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger rejectedBusinessCount = new AtomicInteger();
        AtomicInteger otherErrorCount = new AtomicInteger();
        ConcurrentHashMap<String, AtomicInteger> errorBreakdown = new ConcurrentHashMap<>();

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < concurrentUsers; i++) {
            final User currentUser = users.get(i);
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    // Tất cả luồng đứng đợi ở vạch xuất phát
                    startLatch.await();

                    // BẮT ĐẦU TRANH CHẤP: Cùng gọi createOrder cho DUY NHẤT 1 ghế
                    OrderRequest request = new OrderRequest(matchId, List.of(seatId));
                    OrderResponse resp = orderService.createOrder(request, currentUser);
                    successCount.incrementAndGet();
                } catch (BusinessException | com.goalhub.exception.SeatConflictException e) {
                    rejectedBusinessCount.incrementAndGet();
                    errorBreakdown.computeIfAbsent(e.getMessage(), k -> new AtomicInteger()).incrementAndGet();
                } catch (Exception e) {
                    otherErrorCount.incrementAndGet();
                    String errType = e.getClass().getSimpleName() + ": " + e.getMessage();
                    errorBreakdown.computeIfAbsent(errType, k -> new AtomicInteger()).incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Đợi tất cả N luồng sẵn sàng
        readyLatch.await(10, TimeUnit.SECONDS);

        // BẮN PHÁT SÚNG XUẤT PHÁT: Giải phóng startLatch cho tất cả luồng lao vào DB cùng 1 lúc!
        startLatch.countDown();

        // Đợi tất cả N luồng hoàn thành
        boolean finished = doneLatch.await(60, TimeUnit.SECONDS);
        long durationMs = System.currentTimeMillis() - startTime;
        executor.shutdown();

        assertThat(finished).as("Tất cả các luồng phải hoàn thành trong 60 giây").isTrue();

        // 3. Thu thập dữ liệu thực tế từ Database MySQL
        Long ordersCountInDb = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM order_items WHERE seat_id = ?", Long.class, seatId);

        Seat finalSeat = seatRepository.findById(seatId).orElseThrow();
        Match finalMatch = matchRepository.findById(matchId).orElseThrow();
        int availableSeatsDecremented = initialAvailableSeats - finalMatch.getAvailableSeats();

        // 4. In bảng báo cáo số liệu Concurrency
        System.out.println("\n=========================================================================================");
        System.out.println("              BẢNG BÁO CÁO KẾT QUẢ TRANH CHẤP GHẾ (SEAT CONTENTION)");
        System.out.println("=========================================================================================");
        System.out.printf(" %-40s : %s\n", "Tổng số người dùng tranh chấp (N)", concurrentUsers);
        System.out.printf(" %-40s : %s\n", "Thời gian hoàn thành tổng cộng", durationMs + " ms");
        System.out.printf(" %-40s : %s\n", "Số request THÀNH CÔNG (tạo đơn)", successCount.get());
        System.out.printf(" %-40s : %s\n", "Số request BỊ TỪ CHỐI (BusinessException)", rejectedBusinessCount.get());
        System.out.printf(" %-40s : %s\n", "Số request GẶP LỖI KHÁC", otherErrorCount.get());
        System.out.printf(" %-40s : %s\n", "Số đơn hàng THỰC TẾ TRONG DB cho ghế này", ordersCountInDb);
        System.out.printf(" %-40s : %s\n", "Trạng thái cuối cùng của ghế", finalSeat.getStatus());
        System.out.printf(" %-40s : %s -> %s (Giảm: %s)\n", "Số ghế trống trận đấu (availableSeats)",
                initialAvailableSeats, finalMatch.getAvailableSeats(), availableSeatsDecremented);
        System.out.println("-----------------------------------------------------------------------------------------");
        System.out.println(" Chi tiết phân loại từ chối / lỗi:");
        errorBreakdown.forEach((msg, count) -> System.out.printf("   * [%d lượt] %s\n", count.get(), msg));
        System.out.println("=========================================================================================\n");

        // 5. ASSERT CHỨNG MINH TÍNH ĐÚNG ĐẮN (Test này PHẢI FAIL khi chưa có cơ chế khóa)
        // Kỳ vọng đúng của hệ thống:
        // - Đúng 1 request thành công
        // - N - 1 request bị từ chối
        // - Đúng 1 đơn hàng trong DB
        // - availableSeats giảm đúng 1
        assertThat(successCount.get())
                .as("Chỉ duy nhất 1 luồng được phép tạo đơn thành công cho ghế này")
                .isEqualTo(1);

        assertThat(ordersCountInDb)
                .as("Cơ sở dữ liệu chỉ được phép chứa đúng 1 đơn hàng cho ghế này (chống bán trùng)")
                .isEqualTo(1L);

        assertThat(availableSeatsDecremented)
                .as("Số lượng availableSeats chỉ được giảm đúng 1")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("Giai đoạn B: Đặt nhiều ghế trong 1 đơn mà 1 ghế bị tranh chấp -> toàn bộ đơn phải rollback, không ghế nào bị giữ nửa chừng")
    void testMultiSeatBookingRollsBackCompletelyWhenOneSeatConflict() {
        // 1. Chuẩn bị trận đấu và 3 ghế
        Match match = matchRepository.saveAndFlush(Match.builder()
                .homeTeam("Arsenal")
                .awayTeam("Chelsea")
                .venue("Emirates Stadium")
                .matchDate(LocalDateTime.now().plusDays(5))
                .status(MatchStatus.UPCOMING)
                .ticketPrice(BigDecimal.valueOf(100000))
                .totalSeats(10)
                .availableSeats(10)
                .build());

        Seat seatA = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("S-A").seatClass(SeatClass.STANDARD)
                .price(BigDecimal.valueOf(100000)).status(SeatStatus.AVAILABLE).version(0L).build());
        Seat seatB = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("S-B").seatClass(SeatClass.STANDARD)
                .price(BigDecimal.valueOf(100000)).status(SeatStatus.AVAILABLE).version(0L).build());
        Seat seatC = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("S-C").seatClass(SeatClass.STANDARD)
                .price(BigDecimal.valueOf(100000)).status(SeatStatus.AVAILABLE).version(0L).build());

        User buyer1 = userRepository.save(User.builder()
                .email("buyer1_" + System.currentTimeMillis() + "@test.com").fullName("Buyer 1").role(Role.USER).password("pass")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build());

        User buyer2 = userRepository.save(User.builder()
                .email("buyer2_" + System.currentTimeMillis() + "@test.com").fullName("Buyer 2").role(Role.USER).password("pass")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build());

        // 2. Buyer 1 nhanh tay đặt thành công ghế B
        orderService.createOrder(new OrderRequest(match.getId(), List.of(seatB.getId())), buyer1);

        // Xác nhận ghế B đã RESERVED
        Seat updatedB = seatRepository.findById(seatB.getId()).orElseThrow();
        assertThat(updatedB.getStatus()).isEqualTo(SeatStatus.RESERVED);

        // 3. Buyer 2 gửi đơn đặt cả 3 ghế [seatA, seatB, seatC]
        // Vì ghế B đã RESERVED nên giao dịch này PHẢI BỊ TỪ CHỐI
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seatA.getId(), seatB.getId(), seatC.getId())), buyer2))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Seat(s) not available");

        // 4. KIỂM TRA TÍNH NGUYÊN TỬ (ATOMICITY & ROLLBACK):
        // Ghế A và Ghế C TUYỆT ĐỐI KHÔNG BỊ GIỮ NỬA CHỪNG -> Vẫn phải là AVAILABLE
        Seat finalA = seatRepository.findById(seatA.getId()).orElseThrow();
        Seat finalC = seatRepository.findById(seatC.getId()).orElseThrow();
        assertThat(finalA.getStatus()).as("Ghế A phải còn AVAILABLE, không được bị giữ nửa chừng").isEqualTo(SeatStatus.AVAILABLE);
        assertThat(finalC.getStatus()).as("Ghế C phải còn AVAILABLE, không được bị giữ nửa chừng").isEqualTo(SeatStatus.AVAILABLE);

        // Không có đơn hàng nào của Buyer 2 được tạo
        Long buyer2Orders = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE user_id = ?", Long.class, buyer2.getId());
        assertThat(buyer2Orders).as("Không có đơn hàng nào của Buyer 2 tồn tại trong DB").isEqualTo(0L);

        // Số ghế trống của trận đấu chỉ giảm 1 (do Buyer 1)
        Match finalMatch = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(finalMatch.getAvailableSeats()).as("Số ghế trống của Match chỉ giảm 1 cho đơn của Buyer 1").isEqualTo(9);

        System.out.println("=========================================================================================");
        System.out.println(" [GIAI ĐOẠN B] KIỂM TRA ĐẶT NHIỀU GHẾ (ATOMIC ROLLBACK) THÀNH CÔNG RỰC RỠ");
        System.out.println(" Ghế B tranh chấp -> Toàn bộ đơn đặt [A, B, C] bị rollback 100%");
        System.out.println(" Trạng thái Ghế A: " + finalA.getStatus() + " (An toàn)");
        System.out.println(" Trạng thái Ghế C: " + finalC.getStatus() + " (An toàn)");
        System.out.println(" Số đơn Buyer 2 trong DB: " + buyer2Orders);
        System.out.println("=========================================================================================");
    }
}
