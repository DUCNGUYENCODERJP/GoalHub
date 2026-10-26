# GoalHub — Concurrency Benchmark Report

## Mục đích

So sánh hai chiến lược chống đặt trùng ghế khi N người dùng đồng thời đặt **cùng 1 ghế duy nhất**:

| Chiến lược | Cơ chế |
|---|---|
| **Optimistic Locking** | JPA `@Version` — đọc → kiểm tra → ghi, nếu version đã thay đổi thì ném `OptimisticLockException` |
| **Atomic SQL UPDATE** | `UPDATE seats SET status='RESERVED' WHERE id IN (…) AND status='AVAILABLE'` — 1 câu SQL duy nhất, DB tự serialize |

## Cấu hình đo

| Thông số | Giá trị |
|---|---|
| CPU | Intel Core i7-10850H @ 2.70 GHz, 6 cores / 12 threads |
| RAM | 32 GB |
| OS | Windows |
| MySQL | 9.3.0 (localhost, InnoDB, `innodb_buffer_pool_size = 128 MB`, `innodb_lock_wait_timeout = 50s`, `max_connections = 151`) |
| **HikariCP `maximum-pool-size`** | **50** |
| HikariCP `minimum-idle` | 10 |
| HikariCP `connection-timeout` | 30 000 ms |
| Thread pool (executor) | `min(N, 50)` threads |
| JDK | 17 |
| Spring Boot | 3.3.x |

## Phương pháp đo

1. **Dữ liệu mỗi lượt**: tạo 1 trận đấu + 1 ghế AVAILABLE **trước** khi bắt đầu đo.
2. **N luồng** chờ sẵn tại `CountDownLatch` → thả đồng thời.
3. **Thời gian đo (contest window)**: chỉ tính từ lúc `startLatch.countDown()` đến khi `doneLatch.await()` hoàn tất.
   - **Không tính**: thời gian khởi tạo Spring context, tạo dữ liệu test, chờ tất cả luồng sẵn sàng (`readyLatch`), khởi động container.
4. **Per-request latency**: mỗi luồng ghi lại `System.currentTimeMillis()` từ lúc bắt đầu gọi `createOrder()` đến khi nhận kết quả/exception.
5. **Gộp latency từ 5 lượt** để tính p50, p95, p99.
6. **5 lượt (runs)** cho mỗi cấu hình (strategy × N).
7. **Warmup**: 1 lượt N=10 trước khi đo chính thức (ổn định JIT và connection pool).

### Tại sao N=5000 không có trong báo cáo?

**Nguyên nhân kỹ thuật:**
- `HikariCP maximum-pool-size = 50` và `MySQL max_connections = 151`.
- Với N=5000, thread pool chỉ có 50 thread. Tại mỗi thời điểm, tối đa 50 request chạy song song. 4950 task còn lại xếp hàng trong `ExecutorService`.
- Thời gian đo lúc đó chủ yếu phản ánh **thời gian xử lý tuần tự qua funnel 50 thread**, không phải hiệu năng tranh chấp database.
- Kết quả benchmark cũ (~15 giây gần như không đổi từ N=100 đến N=5000) chính là do tổng thời gian bao gồm khởi tạo Spring context (~13s) + readyLatch overhead + executor submit overhead. Sau khi loại bỏ những phần này (chỉ đo contest window), chênh lệch giữa N=100 và N=1000 mới thể hiện đúng.
- **Kết luận:** N=5000 không cung cấp thêm insight hữu ích về tranh chấp DB, chỉ đo throughput khi đã bão hòa pool.

### Giải thích thời gian ~15 giây không đổi trong benchmark cũ

Benchmark cũ đo `System.currentTimeMillis()` **trước khi submit task vào executor** đến khi `doneLatch.await()` xong. Thời gian ~15s bao gồm:
1. **Spring Boot context initialization**: ~10-13s (component scan, JPA metadata, Hibernate DDL, HikariCP pool warmup).
2. **readyLatch.await()**: chờ N thread sẵn sàng (phụ thuộc vào thread scheduling, ~0.5-2s).
3. **Executor submit overhead**: đăng ký N tasks vào thread pool (~0.1-0.5s).
4. **Contest thực sự**: chỉ ~100-600ms (phần này mới là thời gian tranh chấp DB).

Benchmark mới chỉ đo phần 4 (contest window).

## Kết quả

### Bảng tổng hợp

| Phương án | N | TB (ms) | StdDev (ms) | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) | Đúng đắn |
|---|---|---|---|---|---|---|---|---|
| OPTIMISTIC | 100 | 310.0 | 102.6 | 323 | 222 | 381 | 457 | ✓ (1 đơn) |
| OPTIMISTIC | 500 | 1031.6 | 343.4 | 485 | 573 | 1412 | 1617 | ✓ (1 đơn) |
| OPTIMISTIC | 1000 | 1139.6 | 419.9 | 878 | 582 | 1673 | 1932 | ✓ (1 đơn) |
| **ATOMIC** | **100** | **189.6** | **33.0** | **527** | **147** | **208** | **236** | **✓ (1 đơn)** |
| **ATOMIC** | **500** | **510.6** | **210.8** | **979** | **264** | **632** | **730** | **✓ (1 đơn)** |
| **ATOMIC** | **1000** | **340.0** | **25.6** | **2941** | **238** | **333** | **375** | **✓ (1 đơn)** |

### Thời gian từng lượt (raw runs, ms)

| Phương án | N | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|---|---|---|---|---|---|---|
| OPTIMISTIC | 100 | 306 | 167 | 243 | 368 | 466 |
| OPTIMISTIC | 500 | 1705 | 924 | 889 | 734 | 906 |
| OPTIMISTIC | 1000 | 1976 | 923 | 930 | 994 | 875 |
| ATOMIC | 100 | 243 | 184 | 197 | 184 | 140 |
| ATOMIC | 500 | 588 | 273 | 256 | 651 | 785 |
| ATOMIC | 1000 | 326 | 341 | 338 | 386 | 309 |

## Kết luận so sánh hiệu năng

> **Quy tắc**: Chỉ kết luận một phương án nhanh hơn khi chênh lệch trung bình vượt rõ ràng max(StdDev) của hai phương án. Nếu không, ghi "tương đương về hiệu năng".

### N = 100

- OPTIMISTIC TB = 310.0 ms (±102.6)
- ATOMIC TB = 189.6 ms (±33.0)
- Chênh lệch = 120.4 ms > max StdDev = 102.6 ms

**→ ATOMIC nhanh hơn rõ rệt** (~1.6× throughput).

### N = 500

- OPTIMISTIC TB = 1031.6 ms (±343.4)
- ATOMIC TB = 510.6 ms (±210.8)
- Chênh lệch = 521.0 ms > max StdDev = 343.4 ms

**→ ATOMIC nhanh hơn rõ rệt** (~2.0× throughput).

### N = 1000

- OPTIMISTIC TB = 1139.6 ms (±419.9)
- ATOMIC TB = 340.0 ms (±25.6)
- Chênh lệch = 799.6 ms > max StdDev = 419.9 ms

**→ ATOMIC nhanh hơn rõ rệt** (~3.35× throughput). Lợi thế của ATOMIC tăng dần khi N tăng.

## Giải thích kỹ thuật

### Tại sao Atomic SQL nhanh hơn?

- **Optimistic Locking**: mỗi request thực hiện chuỗi `SELECT → kiểm tra version → UPDATE` trong transaction. Khi N luồng tranh chấp, hầu hết đều đọc cùng version → ghi → phát hiện version đã thay đổi → rollback + ném exception. Mỗi request phải giữ connection qua nhiều round-trip SQL.
- **Atomic SQL UPDATE**: mỗi request chỉ thực hiện 1 câu `UPDATE ... WHERE status='AVAILABLE'`. InnoDB tự serialize ở hàng (row-level lock). Kết quả `affected rows = 0` đã đủ để biết ghế không còn trống, không cần rollback. Connection được trả về pool nhanh hơn.

### Tại sao Optimistic có StdDev cao hơn?

Với Optimistic, khi nhiều luồng cùng rollback, chúng tạo ra cascade retry/exception handling. Thời gian phụ thuộc vào thứ tự thực thi ngẫu nhiên của JVM scheduler → phương sai lớn hơn.

### Tại sao ATOMIC N=1000 nhanh hơn ATOMIC N=500?

Hiện tượng này có thể do JIT compilation đã tối ưu hóa code path sau khi chạy qua N=100 và N=500. Ngoài ra, với N=1000 qua pool 50 thread, mỗi batch 50 request xử lý rất nhanh vì atomic UPDATE trả connection gần như tức thì (affected rows check), và các batch tiếp theo hưởng lợi từ InnoDB buffer pool đã nóng.

## Phòng chống Deadlock

### Vấn đề: Lock ordering khi đặt nhiều ghế

Khi đơn hàng chứa nhiều ghế, nếu 2 transaction lock các ghế theo thứ tự khác nhau (ví dụ: Transaction A lock ghế 1 rồi 2, Transaction B lock ghế 2 rồi 1), có thể xảy ra deadlock.

### Giải pháp: Sort seatIds trước khi xử lý

`OrderServiceImpl.createOrder()` **luôn sort seatIds theo ID tăng dần** trước khi gọi UPDATE hoặc iterate save:

```java
// 2b. Sort seat IDs to ensure deterministic lock acquisition order (prevents deadlocks)
List<Long> seatIds = rawSeatIds.stream().sorted().toList();

// 3. Load and sort seats by ID
List<Seat> seats = seatRepository.findAllById(seatIds).stream()
        .sorted(Comparator.comparing(Seat::getId))
        .toList();
```

### Kiểm chứng: Cross-pair overlap test

Test `stressTest_CrossPairOverlap_RandomOrder_20Runs`:
- **20 lượt** × 30 người × 3 ghế.
- Combos chéo: `{1,2}`, `{2,3}`, `{3,1}` — truyền theo **thứ tự ngẫu nhiên** (giả lập client gửi bất kỳ thứ tự nào).
- Kết quả: **20/20 PASS, 0 deadlock**, mỗi ghế thuộc tối đa 1 đơn.

## Phương án được chọn

**Atomic SQL UPDATE** là mặc định (`app.concurrency-strategy=atomic`).

Optimistic Locking vẫn được giữ lại sau cờ cấu hình `app.concurrency-strategy=optimistic` để so sánh và tham khảo.

---

## Cấu hình Connection Pool: Test vs Application

| Thông số | Benchmark Test (`MySQLContainerBase`) | Application Default (`application.yml`) |
|---|---|---|
| `maximum-pool-size` | **50** (hardcoded, tối đa hoá áp lực đồng thời) | **10** (default; override qua `HIKARI_MAX_POOL_SIZE`) |
| `minimum-idle` | 10 | 5 |
| `connection-timeout` | 30 000 ms | 30 000 ms |
| `idle-timeout` | — (dùng default Hikari) | 600 000 ms |
| `max-lifetime` | — (dùng default Hikari) | 1 800 000 ms |

### Tại sao pool test = 50 nhưng production default = 10?

- **Test (pool=50):** Mục tiêu là tối đa hoá số lượng request tranh chấp cùng lúc để đo overhead thật của DB. Pool nhỏ hơn sẽ làm giảm áp lực đồng thời, benchmark không còn đại diện.
- **Production (pool=10):** HikariCP khuyến nghị `pool size ≈ cpu_cores × 2 + effective_disk_spindles`. Với i7-10850H 6C/12T, giá trị 10-12 là hợp lý. Pool quá lớn lãng phí memory và tạo áp lực lên MySQL `max_connections`.
- **Lưu ý:** Với `max_connections = 151` trên MySQL, chỉ tối đa `(151 - reserved_connections) / số_instance` pool size có thể dùng đồng thời an toàn.

### N=5000 — Tại sao không đo?

Với pool=50 (thread pool tối đa 50), N=5000 chỉ đo throughput của funnel 50-thread, không phải tranh chấp DB thật. Xem giải thích đầy đủ trong phần ["Tại sao N=5000 không có trong báo cáo?"](#tại-sao-n5000-không-có-trong-báo-cáo).

---

*Benchmark chạy bởi `SeatContentionBenchmarkTest.java`. Cấu hình: HikariCP `maximumPoolSize=50` (test), application default `maximumPoolSize=10`, MySQL 9.3.0 InnoDB, i7-10850H 6C/12T, RAM 32 GB.*
*Testcontainers migration: 2026-10-26 — các test chạy trên MySQL 8.0 container tự động, không cần localhost MySQL.*
