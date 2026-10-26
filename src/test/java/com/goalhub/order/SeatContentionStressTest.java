package com.goalhub.order;

import com.goalhub.exception.BusinessException;
import com.goalhub.exception.SeatConflictException;
import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.match.MatchStatus;
import com.goalhub.order.dto.OrderRequest;
import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatRepository;
import com.goalhub.seat.SeatStatus;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
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
 * BƯỚC 5 — GIAI ĐOẠN D: Stress test & kịch bản phức tạp.
 *
 * Test 1: Chạy 20 lượt liên tiếp (N=100 mỗi lượt) → 0 flaky.
 * Test 2: 50 người tranh nhau 3 ghế, mỗi đơn chọn 2 ghế (có chồng lấn) → đảm bảo đúng đắn.
 *
 * Chiến lược mặc định: atomic (theo kết luận Giai đoạn C).
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class SeatContentionStressTest extends MySQLContainerBase {

    @Autowired private OrderServiceImpl orderService;
    @Autowired private MatchRepository matchRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private static final int POOL_SIZE = 50;
    private List<User> userPool;

    @BeforeAll
    void prepareUsers() {
        // Đảm bảo chiến lược atomic (thay thế cho @TestPropertySource đã bỏ)
        orderService.setConcurrencyStrategy("atomic");
        System.out.println(">>> [SETUP] Nạp user pool (200 users)...");
        userPool = prepareUserPool(200);
        System.out.println(">>> [SETUP] Hoàn tất. User pool = " + userPool.size());
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TEST 1: STRESS TEST 20 LƯỢT LIÊN TIẾP — KHÔNG FLAKY
    // ═══════════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GIAI ĐOẠN D — Test 1: 20 lượt liên tiếp, N=100 mỗi lượt, chiến lược ATOMIC, 0 flaky")
    void stressTest_20ConsecutiveRuns_N100_ZeroFlaky() throws InterruptedException {
        final int TOTAL_RUNS = 20;
        final int N = 100;
        int passCount = 0;
        int failCount = 0;
        List<String> failDetails = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(POOL_SIZE);

        System.out.println("\n═══════════════════════════════════════════════════════════════════════");
        System.out.println("  GIAI ĐOẠN D — STRESS TEST: 20 LƯỢT × N=100 | CHIẾN LƯỢC: ATOMIC");
        System.out.println("═══════════════════════════════════════════════════════════════════════");

        for (int run = 1; run <= TOTAL_RUNS; run++) {
            // Tạo dữ liệu mới cho mỗi lượt
            Match match = matchRepository.saveAndFlush(Match.builder()
                    .homeTeam("Stress Home").awayTeam("Stress Away").venue("Stress Stadium")
                    .matchDate(LocalDateTime.now().plusDays(30))
                    .status(MatchStatus.UPCOMING)
                    .ticketPrice(BigDecimal.valueOf(100000))
                    .totalSeats(1).availableSeats(1)
                    .build());

            Seat seat = seatRepository.saveAndFlush(Seat.builder()
                    .match(match).seatCode("STRESS-" + run + "-" + System.nanoTime() % 100000)
                    .seatClass(SeatClass.VIP).price(BigDecimal.valueOf(100000))
                    .status(SeatStatus.AVAILABLE).version(0L).build());

            final Long matchId = match.getId();
            final Long seatId = seat.getId();

            CountDownLatch readyLatch = new CountDownLatch(N);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(N);

            AtomicInteger success = new AtomicInteger();
            AtomicInteger rejected = new AtomicInteger();
            AtomicInteger other = new AtomicInteger();

            for (int i = 0; i < N; i++) {
                final User user = userPool.get(i % userPool.size());
                executor.submit(() -> {
                    readyLatch.countDown();
                    try {
                        startLatch.await();
                        orderService.createOrder(new OrderRequest(matchId, List.of(seatId)), user);
                        success.incrementAndGet();
                    } catch (SeatConflictException | BusinessException e) {
                        rejected.incrementAndGet();
                    } catch (Exception e) {
                        other.incrementAndGet();
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            readyLatch.await(15, TimeUnit.SECONDS);
            startLatch.countDown();
            doneLatch.await(30, TimeUnit.SECONDS);

            // Kiểm tra DB
            Long ordersInDb = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM order_items WHERE seat_id = ?", Long.class, seatId);
            Match finalMatch = matchRepository.findById(matchId).orElseThrow();

            boolean correct = success.get() == 1
                    && ordersInDb != null && ordersInDb == 1L
                    && finalMatch.getAvailableSeats() == 0
                    && other.get() == 0;

            String status = correct ? "✓ PASS" : "✗ FAIL";
            if (correct) {
                passCount++;
            } else {
                failCount++;
                failDetails.add(String.format("Run %d: success=%d, ordersInDb=%d, availableSeats=%d, other=%d",
                        run, success.get(), ordersInDb, finalMatch.getAvailableSeats(), other.get()));
            }

            System.out.printf("  Lượt %2d / %d: %s | success=%d | rejected=%d | otherErr=%d | ordersInDb=%d | availSeats=%d\n",
                    run, TOTAL_RUNS, status, success.get(), rejected.get(), other.get(), ordersInDb, finalMatch.getAvailableSeats());
        }

        executor.shutdown();

        System.out.println("───────────────────────────────────────────────────────────────────────");
        System.out.printf("  KẾT QUẢ: %d / %d PASS  |  %d FAIL\n", passCount, TOTAL_RUNS, failCount);
        if (!failDetails.isEmpty()) {
            System.out.println("  CHI TIẾT FAIL:");
            failDetails.forEach(d -> System.out.println("    " + d));
        }
        System.out.println("═══════════════════════════════════════════════════════════════════════\n");

        assertThat(passCount)
                .as("20/20 lượt phải PASS. Chi tiết fail (nếu có): %s", failDetails)
                .isEqualTo(TOTAL_RUNS);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TEST 2: NHIỀU GHẾ CHỒNG LẤN — N=50, mỗi đơn chọn 2 trong 3 ghế
    // ═══════════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GIAI ĐOẠN D — Test 2: 50 người tranh 3 ghế, mỗi đơn 2 ghế (chồng lấn), chiến lược ATOMIC")
    void stressTest_OverlappingMultiSeat_N50_3Seats() throws InterruptedException {
        final int N = 50;

        System.out.println("\n═══════════════════════════════════════════════════════════════════════");
        System.out.println("  GIAI ĐOẠN D — TEST NHIỀU GHẾ CHỒNG LẤN: 50 NGƯỜI × 3 GHẾ");
        System.out.println("  Mỗi đơn chọn 2 trong 3 ghế → giao nhau, kiểm tra đúng đắn");
        System.out.println("═══════════════════════════════════════════════════════════════════════");

        Match match = matchRepository.saveAndFlush(Match.builder()
                .homeTeam("Overlap Home").awayTeam("Overlap Away").venue("Overlap Stadium")
                .matchDate(LocalDateTime.now().plusDays(20))
                .status(MatchStatus.UPCOMING)
                .ticketPrice(BigDecimal.valueOf(150000))
                .totalSeats(3).availableSeats(3)
                .build());

        Seat seatA = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("OL-A-" + System.nanoTime() % 100000)
                .seatClass(SeatClass.VIP).price(BigDecimal.valueOf(150000))
                .status(SeatStatus.AVAILABLE).version(0L).build());

        Seat seatB = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("OL-B-" + System.nanoTime() % 100000)
                .seatClass(SeatClass.STANDARD).price(BigDecimal.valueOf(100000))
                .status(SeatStatus.AVAILABLE).version(0L).build());

        Seat seatC = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("OL-C-" + System.nanoTime() % 100000)
                .seatClass(SeatClass.STANDARD).price(BigDecimal.valueOf(100000))
                .status(SeatStatus.AVAILABLE).version(0L).build());

        final Long matchId = match.getId();
        // 3 combo chọn 2 trong 3 ghế: [A,B], [B,C], [A,C]
        List<List<Long>> combos = List.of(
                List.of(seatA.getId(), seatB.getId()),   // combo 0
                List.of(seatB.getId(), seatC.getId()),   // combo 1
                List.of(seatA.getId(), seatC.getId())    // combo 2
        );

        CountDownLatch readyLatch = new CountDownLatch(N);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(N);

        AtomicInteger success = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();
        ConcurrentLinkedQueue<String> successDetails = new ConcurrentLinkedQueue<>();

        ExecutorService executor = Executors.newFixedThreadPool(Math.min(N, POOL_SIZE));

        for (int i = 0; i < N; i++) {
            final User user = userPool.get(i % userPool.size());
            final List<Long> seatIds = combos.get(i % combos.size()); // Round-robin combo
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.createOrder(new OrderRequest(matchId, seatIds), user);
                    success.incrementAndGet();
                    successDetails.add("userId=" + user.getId() + " seats=" + seatIds);
                } catch (SeatConflictException | BusinessException e) {
                    rejected.incrementAndGet();
                } catch (Exception e) {
                    other.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(15, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // Kiểm tra DB
        Match finalMatch = matchRepository.findById(matchId).orElseThrow();
        Seat finalA = seatRepository.findById(seatA.getId()).orElseThrow();
        Seat finalB = seatRepository.findById(seatB.getId()).orElseThrow();
        Seat finalC = seatRepository.findById(seatC.getId()).orElseThrow();

        int reservedCount = 0;
        if (finalA.getStatus() == SeatStatus.RESERVED) reservedCount++;
        if (finalB.getStatus() == SeatStatus.RESERVED) reservedCount++;
        if (finalC.getStatus() == SeatStatus.RESERVED) reservedCount++;

        Long totalOrderItems = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM order_items oi " +
                "JOIN orders o ON oi.order_id = o.id " +
                "WHERE o.match_id = ?", Long.class, matchId);

        Long totalOrders = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE match_id = ?", Long.class, matchId);

        System.out.println("───────────────────────────────────────────────────────────────────────");
        System.out.printf("  Kết quả: success=%d | rejected=%d | otherErr=%d\n",
                success.get(), rejected.get(), other.get());
        System.out.printf("  Đơn hàng trong DB:  %d đơn | %d order_items\n", totalOrders, totalOrderItems);
        System.out.printf("  Ghế A (%s): %s\n", seatA.getSeatCode(), finalA.getStatus());
        System.out.printf("  Ghế B (%s): %s\n", seatB.getSeatCode(), finalB.getStatus());
        System.out.printf("  Ghế C (%s): %s\n", seatC.getSeatCode(), finalC.getStatus());
        System.out.printf("  Ghế RESERVED: %d / 3\n", reservedCount);
        System.out.printf("  availableSeats trận: %d (ban đầu 3)\n", finalMatch.getAvailableSeats());
        if (!successDetails.isEmpty()) {
            System.out.println("  Chi tiết đơn thành công:");
            successDetails.forEach(d -> System.out.println("    - " + d));
        }
        System.out.println("═══════════════════════════════════════════════════════════════════════\n");

        // ── ASSERT: Tính đúng đắn ──────────────────────────────────────────────
        // Mỗi đơn thành công đặt 2 ghế. Với 3 ghế, tối đa 1 đơn có thể thành công
        // (vì bất kỳ 2 combo nào cũng giao nhau ít nhất 1 ghế).
        assertThat(success.get())
                .as("Chỉ tối đa 1 đơn thành công vì 3 combo đều giao nhau ít nhất 1 ghế")
                .isEqualTo(1);

        assertThat(other.get())
                .as("Không có lỗi bất ngờ")
                .isEqualTo(0);

        // Đúng 2 ghế RESERVED (vì đơn thành công đặt 2 ghế)
        assertThat(reservedCount)
                .as("Đúng 2 ghế RESERVED (từ đơn thành công)")
                .isEqualTo(2);

        // availableSeats = 3 - 2 = 1
        assertThat(finalMatch.getAvailableSeats())
                .as("availableSeats phải giảm đúng 2 (từ 3 về 1)")
                .isEqualTo(1);

        // Đúng 1 đơn, 2 order_items
        assertThat(totalOrders)
                .as("Đúng 1 đơn hàng trong DB")
                .isEqualTo(1L);
        assertThat(totalOrderItems)
                .as("Đúng 2 order_items (vì đơn đặt 2 ghế)")
                .isEqualTo(2L);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TEST 3: CHỒNG LẤN CHÉO × 20 LƯỢT — TRUYỀN seatIds THỨ TỰ NGẪU NHIÊN
    // Mục đích: xác nhận seatIds được sort cố định trước UPDATE (không deadlock)
    // ═══════════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GIAI ĐOẠN D — Test 3: 20 lượt × 30 người × 3 ghế, mỗi đơn 2 ghế chéo, seatIds ngẫu nhiên, 0 deadlock")
    void stressTest_CrossPairOverlap_RandomOrder_20Runs() throws InterruptedException {
        final int TOTAL_RUNS = 20;
        final int N = 30; // 30 concurrent users per run
        int passCount = 0;
        int deadlockCount = 0;
        List<String> failDetails = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(POOL_SIZE);
        java.util.Random rng = new java.util.Random(42); // Seed cố định để reproducible

        System.out.println("\n═══════════════════════════════════════════════════════════════════════");
        System.out.println("  GIAI ĐOẠN D — TEST 3: CHỒNG LẤN CHÉO 20 LƯỢT × 30 NGƯỜI × 3 GHẾ");
        System.out.println("  Combos: {1,2}, {2,3}, {3,1} — truyền seatIds THỨ TỰ NGẪU NHIÊN");
        System.out.println("  Mục tiêu: 0 deadlock, mỗi ghế thuộc tối đa 1 đơn");
        System.out.println("═══════════════════════════════════════════════════════════════════════");

        for (int run = 1; run <= TOTAL_RUNS; run++) {
            // Tạo dữ liệu sạch
            Match match = matchRepository.saveAndFlush(Match.builder()
                    .homeTeam("Cross Home").awayTeam("Cross Away").venue("Cross Stadium")
                    .matchDate(LocalDateTime.now().plusDays(40))
                    .status(MatchStatus.UPCOMING)
                    .ticketPrice(BigDecimal.valueOf(100000))
                    .totalSeats(3).availableSeats(3)
                    .build());

            Seat s1 = seatRepository.saveAndFlush(Seat.builder()
                    .match(match).seatCode("X1-" + run + "-" + System.nanoTime() % 100000)
                    .seatClass(SeatClass.VIP).price(BigDecimal.valueOf(100000))
                    .status(SeatStatus.AVAILABLE).version(0L).build());
            Seat s2 = seatRepository.saveAndFlush(Seat.builder()
                    .match(match).seatCode("X2-" + run + "-" + System.nanoTime() % 100000)
                    .seatClass(SeatClass.STANDARD).price(BigDecimal.valueOf(80000))
                    .status(SeatStatus.AVAILABLE).version(0L).build());
            Seat s3 = seatRepository.saveAndFlush(Seat.builder()
                    .match(match).seatCode("X3-" + run + "-" + System.nanoTime() % 100000)
                    .seatClass(SeatClass.STANDARD).price(BigDecimal.valueOf(80000))
                    .status(SeatStatus.AVAILABLE).version(0L).build());

            final Long matchId = match.getId();

            // 3 combos chéo nhau: {1,2}, {2,3}, {3,1}
            // Truyền theo THỨ TỰ NGẪU NHIÊN (để test sort trong service)
            List<List<Long>> combos = new ArrayList<>();
            combos.add(randomizeOrder(rng, s1.getId(), s2.getId())); // {1,2} or {2,1}
            combos.add(randomizeOrder(rng, s2.getId(), s3.getId())); // {2,3} or {3,2}
            combos.add(randomizeOrder(rng, s3.getId(), s1.getId())); // {3,1} or {1,3}

            CountDownLatch readyLatch = new CountDownLatch(N);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(N);

            AtomicInteger success = new AtomicInteger();
            AtomicInteger rejected = new AtomicInteger();
            AtomicInteger deadlocks = new AtomicInteger();
            AtomicInteger other = new AtomicInteger();
            ConcurrentLinkedQueue<String> errorMsgs = new ConcurrentLinkedQueue<>();

            for (int i = 0; i < N; i++) {
                final User user = userPool.get(i % userPool.size());
                final List<Long> seatIds = combos.get(i % combos.size());
                executor.submit(() -> {
                    readyLatch.countDown();
                    try {
                        startLatch.await();
                        orderService.createOrder(new OrderRequest(matchId, seatIds), user);
                        success.incrementAndGet();
                    } catch (SeatConflictException | BusinessException e) {
                        rejected.incrementAndGet();
                    } catch (Exception e) {
                        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                        if (msg.contains("deadlock") || msg.contains("lock wait timeout")) {
                            deadlocks.incrementAndGet();
                            errorMsgs.add("DEADLOCK: " + e.getMessage());
                        } else {
                            other.incrementAndGet();
                            errorMsgs.add(e.getClass().getSimpleName() + ": " + e.getMessage());
                        }
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            readyLatch.await(15, TimeUnit.SECONDS);
            startLatch.countDown();
            doneLatch.await(30, TimeUnit.SECONDS);

            // Kiểm tra DB
            Match finalMatch = matchRepository.findById(matchId).orElseThrow();
            Seat f1 = seatRepository.findById(s1.getId()).orElseThrow();
            Seat f2 = seatRepository.findById(s2.getId()).orElseThrow();
            Seat f3 = seatRepository.findById(s3.getId()).orElseThrow();

            // Đếm ghế RESERVED
            int reservedCount = 0;
            if (f1.getStatus() == SeatStatus.RESERVED) reservedCount++;
            if (f2.getStatus() == SeatStatus.RESERVED) reservedCount++;
            if (f3.getStatus() == SeatStatus.RESERVED) reservedCount++;

            Long totalOrders = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM orders WHERE match_id = ?", Long.class, matchId);

            // Kiểm tra mỗi ghế thuộc tối đa 1 đơn
            Long maxOrdersPerSeat = jdbcTemplate.queryForObject(
                    "SELECT MAX(cnt) FROM (SELECT seat_id, COUNT(*) as cnt FROM order_items oi " +
                    "JOIN orders o ON oi.order_id = o.id WHERE o.match_id = ? GROUP BY seat_id) t",
                    Long.class, matchId);

            boolean noDeadlock = deadlocks.get() == 0;
            boolean seatBelongsToMaxOneOrder = maxOrdersPerSeat == null || maxOrdersPerSeat <= 1L;
            boolean correctSuccess = success.get() <= 1; // Tối đa 1 đơn thành công (vì combos giao nhau)
            boolean noOtherErrors = other.get() == 0;
            boolean correct = noDeadlock && seatBelongsToMaxOneOrder && correctSuccess && noOtherErrors;

            if (correct) {
                passCount++;
            } else {
                failDetails.add(String.format("Run %d: success=%d, deadlocks=%d, other=%d, maxOrdersPerSeat=%s, reserved=%d",
                        run, success.get(), deadlocks.get(), other.get(), maxOrdersPerSeat, reservedCount));
            }
            if (deadlocks.get() > 0) deadlockCount += deadlocks.get();

            System.out.printf("  Lượt %2d / %d: %s | success=%d | rejected=%d | deadlock=%d | otherErr=%d | reserved=%d/3 | orders=%d | maxPerSeat=%s\n",
                    run, TOTAL_RUNS,
                    correct ? "✓ PASS" : "✗ FAIL",
                    success.get(), rejected.get(), deadlocks.get(), other.get(),
                    reservedCount, totalOrders, maxOrdersPerSeat);
            if (!errorMsgs.isEmpty()) {
                errorMsgs.forEach(m -> System.out.println("      ERR: " + m));
            }
        }

        executor.shutdown();

        System.out.println("───────────────────────────────────────────────────────────────────────");
        System.out.printf("  KẾT QUẢ: %d / %d PASS  |  Tổng deadlock: %d\n", passCount, TOTAL_RUNS, deadlockCount);
        if (!failDetails.isEmpty()) {
            System.out.println("  CHI TIẾT FAIL:");
            failDetails.forEach(d -> System.out.println("    " + d));
        }
        System.out.println("═══════════════════════════════════════════════════════════════════════\n");

        assertThat(deadlockCount)
                .as("Tổng deadlock qua 20 lượt phải = 0 (seatIds đã được sort trước UPDATE)")
                .isEqualTo(0);
        assertThat(passCount)
                .as("20/20 lượt phải PASS. Chi tiết fail (nếu có): %s", failDetails)
                .isEqualTo(TOTAL_RUNS);
    }

    /**
     * Trả về list [a, b] hoặc [b, a] một cách ngẫu nhiên.
     * Mục đích: giả lập client gửi seatIds không theo thứ tự.
     */
    private List<Long> randomizeOrder(java.util.Random rng, Long a, Long b) {
        return rng.nextBoolean() ? List.of(a, b) : List.of(b, a);
    }

    // ─── Helper ─────────────────────────────────────────────────────────────────

    private List<User> prepareUserPool(int count) {
        Long existingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email LIKE 'stress_user_%'", Long.class);
        if (existingCount == null || existingCount < count) {
            int startIdx = (existingCount == null) ? 1 : (existingCount.intValue() + 1);
            List<Object[]> batch = new ArrayList<>();
            for (int i = startIdx; i <= count; i++) {
                batch.add(new Object[]{"stress_user_" + i + "@stress.com", "Stress User " + i, "USER", "$2a$10$abcdefghijklmnopqrstuv"});
            }
            if (!batch.isEmpty()) {
                jdbcTemplate.batchUpdate(
                        "INSERT INTO users (email, full_name, role, password, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, NOW(), NOW())", batch);
            }
        }
        return userRepository.findAll().stream()
                .filter(u -> u.getEmail().startsWith("stress_user_"))
                .limit(count)
                .toList();
    }
}
