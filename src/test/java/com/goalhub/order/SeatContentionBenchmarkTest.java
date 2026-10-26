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
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BƯỚC 5 — GIAI ĐOẠN C (CẢI TIẾN): Benchmark chính xác với phân tích độ trễ thực sự.
 *
 * Cài đặt máy đo:
 * - Thời gian đo: CHỈ tính từ khi startLatch.countDown() đến khi doneLatch.await() xong.
 *   Không tính khởi tạo dữ liệu, không tính readyLatch.await().
 * - N = 100, 500 (bỏ 5000 do bottleneck connection pool 50 connections / 151 max_connections MySQL
 *   làm cho N lớn chỉ đo thời gian chờ pool, không phải tranh chấp DB thực sự).
 * - Đo per-request latency: p50, p95, p99 (bằng ConcurrentLinkedQueue<Long>).
 * - Throughput = N / totalDurationSeconds (requests/second).
 * - 5 runs mỗi cấu hình, tính trung bình và độ lệch chuẩn (std dev).
 *
 * Lý do bỏ N=5000 (giải thích rõ ràng):
 * - HikariCP max-pool-size = 50, MySQL max_connections = 151.
 * - Với N=5000, có 4950 luồng xếp hàng chờ connection từ pool (connection-timeout=30000ms=30s).
 * - Thời gian đo hầu hết là thời gian chờ pool thay vì latency DB thực sự.
 * - Kết quả benchmark như vậy không phản ánh đúng hiệu năng tranh chấp database.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class SeatContentionBenchmarkTest extends MySQLContainerBase {

    @Autowired
    private OrderServiceImpl orderService;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final int POOL_SIZE = 50;
    private static final int RUNS_PER_CONFIG = 5;

    private List<User> userPool;

    @BeforeAll
    void prepareUsers() {
        System.out.println(">>> [SETUP] Nạp trước user pool (1000 users)...");
        userPool = prepareUserPool(1000);
        // Warmup: chạy 1 lượt nhỏ để JIT và connection pool ổn định
        System.out.println(">>> [WARMUP] Chạy warmup 1 lần với N=10...");
        try {
            executeSingleRun("atomic", 10, userPool);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.println(">>> [SETUP] Hoàn tất, bắt đầu benchmark.\n");
    }

    public record RunResult(
            long contestDurationMs,    // Chỉ tính từ startLatch đến doneLatch xong
            int successCount,
            int rejectedCount,
            int otherErrors,
            boolean correct,
            long[] latenciesMs          // Latency từng request tính từ startLatch
    ) {}

    public record BenchmarkSummary(
            String strategy,
            int n,
            double avgDurationMs,
            double stdDevMs,
            double throughputRps,     // requests per second
            double p50Ms,
            double p95Ms,
            double p99Ms,
            double avgSuccess,
            double avgRejected,
            double avgOther,
            boolean allCorrect,
            long[] allRawDurationsMs  // raw values cho 5 runs
    ) {}

    @Test
    @DisplayName("GIAI ĐOẠN C (Cải tiến): Benchmark chính xác Optimistic vs Atomic — N=100, N=500, N=1000, mỗi N 5 runs")
    void runAccurateBenchmarkComparison() throws InterruptedException {
        int[] testNs = {100, 500, 1000};
        String[] strategies = {"optimistic", "atomic"};

        List<BenchmarkSummary> summaries = new ArrayList<>();

        for (String strategy : strategies) {
            for (int n : testNs) {
                System.out.printf("\n>>> [BENCHMARK] Chiến lược: %s | N = %d\n", strategy.toUpperCase(), n);
                List<RunResult> runs = new ArrayList<>();

                for (int run = 1; run <= RUNS_PER_CONFIG; run++) {
                    RunResult result = executeSingleRun(strategy, n, userPool);
                    runs.add(result);
                    System.out.printf("    Lượt %d: %d ms | Thành công: %d | Từ chối: %d | Lỗi: %d | Đúng: %s\n",
                            run, result.contestDurationMs(), result.successCount(),
                            result.rejectedCount(), result.otherErrors(),
                            result.correct() ? "✓" : "✗");
                }

                BenchmarkSummary summary = computeSummary(strategy, n, runs);
                summaries.add(summary);

                System.out.printf("    >> TB: %.1f ms | StdDev: %.1f ms | Throughput: %.0f req/s | p50: %.0f ms | p95: %.0f ms | p99: %.0f ms | Đúng: %s\n",
                        summary.avgDurationMs(), summary.stdDevMs(), summary.throughputRps(),
                        summary.p50Ms(), summary.p95Ms(), summary.p99Ms(),
                        summary.allCorrect() ? "TẤT CẢ" : "CÓ LỖI");
            }
        }

        System.out.println();
        printDetailedReport(summaries);
        printComparisonConclusion(summaries);

        // Assert tất cả đều đúng đắn
        for (BenchmarkSummary s : summaries) {
            assertThat(s.allCorrect())
                    .as("Chiến lược %s N=%d phải cho kết quả đúng đắn (1 đơn, count đúng) trong mọi lần chạy",
                            s.strategy(), s.n())
                    .isTrue();
        }
    }

    private RunResult executeSingleRun(String strategy, int n, List<User> users) throws InterruptedException {
        orderService.setConcurrencyStrategy(strategy);

        // Chuẩn bị dữ liệu sạch (NGOÀI vùng đo thời gian)
        Match match = matchRepository.saveAndFlush(Match.builder()
                .homeTeam("BenchHome").awayTeam("BenchAway").venue("BenchStadium")
                .matchDate(LocalDateTime.now().plusDays(10))
                .status(MatchStatus.UPCOMING)
                .ticketPrice(BigDecimal.valueOf(150000))
                .totalSeats(1).availableSeats(1)
                .build());

        Seat seat = seatRepository.saveAndFlush(Seat.builder()
                .match(match).seatCode("BENCH-HOT-" + System.nanoTime() % 1000000)
                .seatClass(SeatClass.VIP).price(BigDecimal.valueOf(150000))
                .status(SeatStatus.AVAILABLE).version(0L).build());

        final Long matchId = match.getId();
        final Long seatId = seat.getId();

        CountDownLatch readyLatch = new CountDownLatch(n);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(n);

        AtomicInteger success = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();
        AtomicLong startEpoch = new AtomicLong();

        ConcurrentLinkedQueue<Long> latencies = new ConcurrentLinkedQueue<>();

        ExecutorService executor = Executors.newFixedThreadPool(Math.min(n, POOL_SIZE));

        for (int i = 0; i < n; i++) {
            final User user = users.get(i % users.size());
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    long reqStart = System.currentTimeMillis();
                    orderService.createOrder(new OrderRequest(matchId, List.of(seatId)), user);
                    latencies.add(System.currentTimeMillis() - reqStart);
                    success.incrementAndGet();
                } catch (SeatConflictException | BusinessException e) {
                    latencies.add(System.currentTimeMillis() - startEpoch.get());
                    rejected.incrementAndGet();
                } catch (Exception e) {
                    latencies.add(System.currentTimeMillis() - startEpoch.get());
                    other.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Chờ tất cả luồng sẵn sàng ở vạch xuất phát (NGOÀI vùng đo)
        readyLatch.await(30, TimeUnit.SECONDS);

        // ── BẮT ĐẦU ĐO THỜI GIAN ──────────────────────────────────────────────
        long contestStart = System.currentTimeMillis();
        startEpoch.set(contestStart);
        startLatch.countDown(); // Thả tất cả luồng cùng lúc

        doneLatch.await(60, TimeUnit.SECONDS);
        long contestDuration = System.currentTimeMillis() - contestStart;
        // ── KẾT THÚC ĐO THỜI GIAN ─────────────────────────────────────────────

        executor.shutdown();

        // Kiểm tra DB (NGOÀI vùng đo)
        Long ordersInDb = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM order_items WHERE seat_id = ?", Long.class, seatId);
        Match finalMatch = matchRepository.findById(matchId).orElseThrow();
        boolean correct = (success.get() == 1)
                && (ordersInDb != null && ordersInDb == 1L)
                && (finalMatch.getAvailableSeats() == 0);

        long[] latencyArr = latencies.stream().mapToLong(Long::longValue).sorted().toArray();
        return new RunResult(contestDuration, success.get(), rejected.get(), other.get(), correct, latencyArr);
    }

    private BenchmarkSummary computeSummary(String strategy, int n, List<RunResult> runs) {
        double avgDur = runs.stream().mapToLong(RunResult::contestDurationMs).average().orElse(0);
        double stdDev = Math.sqrt(
                runs.stream().mapToDouble(r -> Math.pow(r.contestDurationMs() - avgDur, 2))
                        .average().orElse(0));
        double avgSuccess = runs.stream().mapToInt(RunResult::successCount).average().orElse(0);
        double avgRejected = runs.stream().mapToInt(RunResult::rejectedCount).average().orElse(0);
        double avgOther = runs.stream().mapToInt(RunResult::otherErrors).average().orElse(0);
        boolean allCorrect = runs.stream().allMatch(RunResult::correct);
        double throughput = (n * 1000.0) / avgDur;

        // Gộp tất cả latencies từ 5 runs để tính percentile
        long[] allLatencies = runs.stream()
                .flatMapToLong(r -> LongStream.of(r.latenciesMs()))
                .sorted().toArray();
        double p50 = percentile(allLatencies, 50);
        double p95 = percentile(allLatencies, 95);
        double p99 = percentile(allLatencies, 99);

        long[] rawDurations = runs.stream().mapToLong(RunResult::contestDurationMs).toArray();
        return new BenchmarkSummary(strategy.toUpperCase(), n, avgDur, stdDev, throughput,
                p50, p95, p99, avgSuccess, avgRejected, avgOther, allCorrect, rawDurations);
    }

    private double percentile(long[] sortedArr, int pct) {
        if (sortedArr.length == 0) return 0;
        int idx = (int) Math.ceil(sortedArr.length * pct / 100.0) - 1;
        return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
    }

    private void printDetailedReport(List<BenchmarkSummary> summaries) {
        System.out.println("==============================================================================================================");
        System.out.println("          BẢNG KẾT QUẢ BENCHMARK CHÍNH XÁC — CHỈ ĐO VÙNG TRANH CHẤP (CONTEST WINDOW)");
        System.out.println(" Cấu hình: HikariCP max-pool=50 | MySQL 9.3.0 | Máy: i7-10850H 6C/12T | RAM: 32 GB");
        System.out.println("==============================================================================================================");
        System.out.printf("| %-12s | %5s | %8s | %8s | %10s | %7s | %7s | %7s | %s |\n",
                "Phương án", "N", "TB (ms)", "StdDev", "Throughput", "p50 ms", "p95 ms", "p99 ms", "Đúng đắn");
        System.out.println("|---|---|---|---|---|---|---|---|---|");
        for (BenchmarkSummary s : summaries) {
            System.out.printf("| %-12s | %5d | %8.1f | %8.1f | %8.0f r/s | %7.0f | %7.0f | %7.0f | %s |\n",
                    s.strategy(), s.n(), s.avgDurationMs(), s.stdDevMs(), s.throughputRps(),
                    s.p50Ms(), s.p95Ms(), s.p99Ms(),
                    s.allCorrect() ? "✓ (1 đơn)" : "✗ SAI");
            // In từng run raw
            long[] raws = s.allRawDurationsMs();
            String rawStr = Arrays.stream(raws).mapToObj(v -> v + "ms").collect(Collectors.joining(", "));
            System.out.printf("|              |       | raw runs: %-90s |\n", rawStr);
        }
        System.out.println("==============================================================================================================");
    }

    private void printComparisonConclusion(List<BenchmarkSummary> summaries) {
        System.out.println("\n───────────────────────────── KẾT LUẬN SO SÁNH HIỆU NĂNG ─────────────────────────────");
        int[] ns = {100, 500, 1000};
        for (int n : ns) {
            BenchmarkSummary opt = summaries.stream()
                    .filter(s -> s.strategy().equals("OPTIMISTIC") && s.n() == n)
                    .findFirst().orElse(null);
            BenchmarkSummary atm = summaries.stream()
                    .filter(s -> s.strategy().equals("ATOMIC") && s.n() == n)
                    .findFirst().orElse(null);
            if (opt == null || atm == null) continue;

            double diff = Math.abs(opt.avgDurationMs() - atm.avgDurationMs());
            double pooledStdDev = Math.max(opt.stdDevMs(), atm.stdDevMs());
            System.out.printf("N=%d: OPTIMISTIC TB=%.1f ms (±%.1f) | ATOMIC TB=%.1f ms (±%.1f) | Chênh lệch: %.1f ms\n",
                    n, opt.avgDurationMs(), opt.stdDevMs(), atm.avgDurationMs(), atm.stdDevMs(), diff);
            if (diff > pooledStdDev) {
                String faster = opt.avgDurationMs() < atm.avgDurationMs() ? "OPTIMISTIC" : "ATOMIC";
                System.out.printf("  => %s nhanh hơn rõ rệt (chênh lệch %.1f ms > StdDev %.1f ms)\n", faster, diff, pooledStdDev);
            } else {
                System.out.printf("  => TƯƠNG ĐƯƠNG về hiệu năng (chênh lệch %.1f ms ≤ StdDev %.1f ms)\n", diff, pooledStdDev);
            }
        }
        System.out.println("─────────────────────────────────────────────────────────────────────────────────────\n");
    }

    private List<User> prepareUserPool(int count) {
        Long existingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email LIKE 'bench_user_%'", Long.class);
        if (existingCount == null || existingCount < count) {
            int startIdx = (existingCount == null) ? 1 : (existingCount.intValue() + 1);
            List<Object[]> batch = new ArrayList<>();
            for (int i = startIdx; i <= count; i++) {
                batch.add(new Object[]{"bench_user_" + i + "@benchmark.com", "Bench User " + i, "USER", "$2a$10$abcdefghijklmnopqrstuv"});
            }
            if (!batch.isEmpty()) {
                jdbcTemplate.batchUpdate(
                        "INSERT INTO users (email, full_name, role, password, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, NOW(), NOW())", batch);
            }
        }
        return userRepository.findAll().stream()
                .filter(u -> u.getEmail().startsWith("bench_user_"))
                .limit(count)
                .toList();
    }
}
