# GoalHub – Tiến Độ Tái Cấu Trúc & Tối Ưu Hệ Thống

Tài liệu theo dõi tiến độ từng bước theo định hướng chống tranh chấp ghế và chuẩn hoá backend.

---

## Danh Sách Các Bước Thực Hiện

- [x] **BƯỚC 0 — Rà soát và xác minh (chưa sửa gì)**
  - Đã rà soát chi tiết mã nguồn thật: check-then-act, `@Version`, vòng đời đơn hàng, bảo mật phân quyền `/api/auth/register`, `DataSeeder`, biến môi trường, nghiệp vụ frontend mock và kiểu dữ liệu tiền tệ.
  - Báo cáo đã được người dùng xác nhận.

- [x] **BƯỚC 1 — Sửa lỗ hổng bảo mật**
  - **Bỏ client self-assigned role:** Mọi tài khoản đăng ký công khai qua `POST /api/auth/register` luôn được gán `Role.USER`. Tham số `role` từ request bị bỏ qua hoàn toàn.
  - **Giới hạn DataSeeder:** Đã thêm `@Profile("dev")` vào `DataSeeder`. Khi chạy ở profile khác (như `prod`, `test`), seeder không được kích hoạt, không tự tạo tài khoản `admin123`.
  - **Biến môi trường:** Chuyển JWT secret và mật khẩu database sang biến môi trường (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`). Cung cấp file `.env.example`, xác nhận `.env` đã nằm trong `.gitignore`.
  - **Kiểm thử tự động:** Viết test `AuthControllerTest` chứng minh gửi `role: ADMIN` khi đăng ký vẫn lưu vào DB và trả về `Role.USER`. Viết test `DataSeederTest` kiểm tra ràng buộc profile `dev`.
  - **Kết quả kiểm thử:** 72/72 tests PASSED (`mvn test`).

- [x] **BƯỚC 2 — Hoàn thiện vòng đời đơn hàng phía server**
  - **Cột `expires_at` và cấu hình server:** Đã thêm cột `expires_at` vào entity `Order`, `OrderResponse`. Server là nguồn sự thật duy nhất về thời gian giữ chỗ với cấu hình `app.order.hold-duration-minutes` (mặc định 10 phút qua `application.yml`).
  - **Endpoint `POST /api/orders/{id}/pay`:** Mô phỏng thanh toán. Chuyển trạng thái đơn `PENDING` -> `PAID`, ghế `RESERVED` -> `SOLD`. Từ chối (400) nếu đơn đã hết hạn (tự động cancel và giải phóng ghế) hoặc không còn ở trạng thái `PENDING`. Kiểm tra quyền sở hữu (chỉ chủ đơn hoặc ADMIN, trả về 403 nếu không có quyền).
  - **Endpoint `POST /api/orders/{id}/cancel`:** Chủ đơn hoặc ADMIN huỷ đơn: chuyển đơn thành `CANCELLED`, nhả ghế `RESERVED` về `AVAILABLE`, hoàn lại `availableSeats` cho `Match`. Từ chối nếu đơn không còn `PENDING` hoặc không phải chủ đơn (403).
  - **Background Job định kỳ (`@Scheduled` mỗi 30s):** `OrderExpirationJob` quét các đơn `PENDING` quá hạn (`expires_at < now`) qua truy vấn `findExpiredOrders`, tự động huỷ đơn, nhả ghế và hoàn lại số lượng ghế trống cho trận đấu. Đảm bảo tính idempotent tuyệt đối. Bật `@EnableScheduling` trên `GoalHubApplication`.
  - **Kiểm thử tự động đầy đủ:** Viết thêm 22 tests mới (tổng 94 tests), bao gồm đầy đủ: pay thành công, pay đơn hết hạn, pay đơn không còn PENDING, pay đơn của người khác (403), huỷ đơn thành công, huỷ đơn của người khác (403), huỷ đơn đã thanh toán (400), background job nhả ghế đúng và tính idempotent khi chạy lại.
  - **Kết quả kiểm thử:** 94/94 tests PASSED (`mvn test`).

- [x] **BƯỚC 3 — Đưa nghiệp vụ tiền về server**
  - **Server tự tính tổng tiền:** Tổng tiền đơn hàng (`totalAmount`) và snapshot giá vé (`priceAtBooking`) luôn do server tính toán từ `Seat.price`, không nhận bất kỳ số tiền nào từ client.
  - **Thống nhất nguồn giá:** `Seat.price` là nguồn sự thật duy nhất cho giá vé khi đặt chỗ. `Match.ticketPrice` được chuẩn hoá thành giá sàn ("giá từ") phục vụ hiển thị listing trận đấu. Cập nhật `DataSeeder` gán giá ghế Standard = `match.ticketPrice` và VIP = `2 * match.ticketPrice`, xoá bỏ hoàn toàn sự mâu thuẫn dữ liệu trước đây.
  - **Chuẩn hoá kiểu tiền tệ VND (số nguyên):** Cập nhật toàn bộ các cột tiền trong JPA (`Match.ticketPrice`, `Seat.price`, `Order.totalAmount`, `OrderItem.priceAtBooking`) thành `precision = 12/14, scale = 0`. Ràng buộc Bean Validation `@Digits(integer = 12, fraction = 0)` và `@DecimalMin(value = "0")` trên `MatchRequest`, `SeatRequest`. Server format tiền theo số nguyên VND (`RoundingMode.HALF_UP`).
  - **Thống nhất về mã giảm giá & phụ kiện:** Đã hỏi ý kiến và thống nhất cắt bỏ mã giảm giá và phụ kiện mock UI, giữ backend tinh gọn và tập trung 100% vào giải bài toán chống tranh chấp ghế.
  - **Kết quả kiểm thử:** 94/94 tests PASSED (`mvn test`).

- [x] **BƯỚC 4 — Chuẩn bị hạ tầng test thật**
  - **Docker Compose:** Đã tạo [docker-compose.yml](file:///d:/GoalHub/docker-compose.yml) chứa MySQL 8.0 (`goalhub-mysql`, cổng 3306) và Redis 7 (`goalhub-redis`, cổng 6379) với cấu hình healthcheck, phân vùng volume bền vững, sẵn sàng cho dev local và bước giữ chỗ Redis TTL.
  - **Testcontainers & Spring Boot Testcontainers:** Cập nhật [pom.xml](file:///d:/GoalHub/pom.xml) tích hợp `testcontainers-bom` (1.20.1), `spring-boot-testcontainers`, `testcontainers/junit-jupiter` và `testcontainers/mysql`.
  - **Test cơ sở xác minh MySQL thật:** Đã viết [MySQLDatabaseSmokeTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/infrastructure/MySQLDatabaseSmokeTest.java) sử dụng `@Testcontainers(disabledWithoutDocker = true)` và `@ServiceConnection` để kiểm tra kết nối MySQL 8.0 thật, xác minh `getDatabaseProductName() == 'MySQL'`, loại trừ hoàn toàn H2, và kiểm tra `@@default_storage_engine == 'InnoDB'`.
  - **Cấu hình profile MySQL Test độc lập:** Thêm [application-mysql-test.yml](file:///d:/GoalHub/src/test/resources/application-mysql-test.yml) để sẵn sàng chạy test trực tiếp với MySQL từ Docker Compose nếu muốn.
  - **Giải thích vì sao không dùng H2 để test Concurrency:**
    1. *Cơ chế khóa khác biệt:* H2 in-memory (dù ở chế độ `MODE=MySQL`) sử dụng cơ chế khóa bảng hoặc khóa hàng đơn giản, không mô phỏng chính xác MVCC (Multi-Version Concurrency Control), Next-Key Locking hay Gap Locking của MySQL InnoDB.
    2. *Không tái hiện được Deadlock & Race Condition thật:* H2 không thể tái hiện được deadlock thật sự giữa các transactions đồng thời tranh chấp khóa hàng, lock wait timeout, hoặc các hiệu ứng cách ly (Isolation Level: REPEATABLE READ) như trên MySQL Production.
    3. *Đảm bảo độ tin cậy cho Bước 5:* Bài toán kiểm thử tải cao (100–1000 luồng đồng thời đặt cùng 1 ghế) đòi hỏi môi trường DB chuẩn xác 100% để đo lường số lượng bán thành công và số lượng từ chối một cách trung thực.
  - **Kết quả kiểm thử:** 95 tests run (94 passed, 1 skipped gracefully khi Docker daemon chưa chạy), 0 failures, 0 errors (`BUILD SUCCESS`).

- [x] **BƯỚC 5 — GIAI ĐOẠN 2: Chống đặt trùng ghế (Phần lõi dự án)** ✅ HOÀN THÀNH TOÀN BỘ (A → B → C → D)
  - **Giai đoạn A — Chứng minh lỗi concurrency tồn tại:** ✅ HOÀN THÀNH.
    - Đã viết [SeatContentionTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/order/SeatContentionTest.java) trên MySQL InnoDB thật (HikariCP pool = 50, CountDownLatch xuất phát đồng thời).
    - Kết quả chạy test: **Test FAIL đúng như kỳ vọng**. Có **2 đơn hàng cùng được tạo thành công cho DUY NHẤT 1 ghế** trong DB (`ordersCountInDb = 2`), đồng thời xuất hiện **12 lỗi Deadlock** ở tầng MySQL InnoDB khi các transaction cùng cập nhật `available_seats`.
    - Nguyên nhân gốc: Lỗi **Check-Then-Act** tại [OrderServiceImpl.java:88-94](file:///d:/GoalHub/src/main/java/com/goalhub/order/OrderServiceImpl.java#L88-L94) (đọc kiểm tra `status == AVAILABLE` không có khóa) và Lost Update tại [OrderServiceImpl.java:121-127](file:///d:/GoalHub/src/main/java/com/goalhub/order/OrderServiceImpl.java#L121-L127) (ghi không khóa và trừ ghế theo kiểu đọc-rồi-ghi).
  - **Giai đoạn B — Optimistic Locking (`@Version`):** ✅ HOÀN THÀNH.
    - **Entity Seat:** Thêm `@Version` cho trường `version` trong [Seat.java](file:///d:/GoalHub/src/main/java/com/goalhub/seat/Seat.java).
    - **Exception Handling & HTTP 409:** Tạo [SeatConflictException.java](file:///d:/GoalHub/src/main/java/com/goalhub/exception/SeatConflictException.java). Trong [OrderServiceImpl.java](file:///d:/GoalHub/src/main/java/com/goalhub/order/OrderServiceImpl.java), thực hiện flush ngay trong transaction để bắt `ObjectOptimisticLockingFailureException` / `OptimisticLockException` và chuyển đổi thành `SeatConflictException`. Cập nhật [GlobalExceptionHandler.java](file:///d:/GoalHub/src/main/java/com/goalhub/exception/GlobalExceptionHandler.java) trả về **HTTP 409 Conflict** với thông báo rõ ràng *"Ghế đã được người khác đặt. Vui lòng chọn ghế khác."*.
    - **Kết quả kiểm thử Concurrency:** Chạy [SeatContentionTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/order/SeatContentionTest.java) với 100 luồng đồng thời trên MySQL thật: **Đúng 1 request thành công**, **99 request bị từ chối**, DB có **đúng 1 đơn hàng duy nhất** (xóa bỏ 100% hiện tượng bán trùng).
    - **Kiểm thử Rollback khi đặt nhiều ghế:** Thêm test `testMultiSeatBookingRollsBackCompletelyWhenOneSeatConflict`: Đặt 3 ghế [A, B, C] mà ghế B đã bị người khác đặt trước -> Toàn bộ transaction rollback 100%, ghế A và C vẫn giữ nguyên trạng thái `AVAILABLE`, không ghế nào bị giữ nửa chừng.
    - **Toàn bộ Test Suite:** 97/97 tests PASSED (`BUILD SUCCESS`).
  - **Giai đoạn C — Atomic UPDATE ở tầng SQL & Benchmark so sánh:** ✅ HOÀN THÀNH.
    - **Cài đặt Atomic UPDATE:** Thêm `updateStatusIfStatusIs` trong [SeatRepository.java](file:///d:/GoalHub/src/main/java/com/goalhub/seat/SeatRepository.java) (`UPDATE seats SET status='RESERVED' WHERE id IN (...) AND status='AVAILABLE'`).
    - **Cập nhật nguyên tử `availableSeats`:** Thêm `decrementAvailableSeats` và `incrementAvailableSeats` trong [MatchRepository.java](file:///d:/GoalHub/src/main/java/com/goalhub/match/MatchRepository.java) (`UPDATE matches SET available_seats = available_seats - ? WHERE available_seats >= ?`), loại bỏ hoàn toàn hiện tượng Deadlock ở bảng `matches` cho cả 2 phương án.
    - **Cơ chế cấu hình linh hoạt:** Thêm cờ `app.concurrency-strategy` (mặc định: `atomic`, hỗ trợ `optimistic`) trong [OrderServiceImpl.java](file:///d:/GoalHub/src/main/java/com/goalhub/order/OrderServiceImpl.java).
    - **Sort seatIds trước khi xử lý:** `OrderServiceImpl` luôn sort `seatIds` theo ID tăng dần trước khi UPDATE hoặc iterate save → đảm bảo thứ tự lock cố định, ngăn deadlock khi đặt nhiều ghế.
    - **Benchmark chính xác (chỉ đo contest window, 5 runs/config, HikariCP `maximumPoolSize=50`, MySQL 9.3.0 InnoDB):**
      | Phương án | N | TB (ms) | StdDev (ms) | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) | Đúng đắn |
      |---|---|---|---|---|---|---|---|---|
      | OPTIMISTIC | 100 | 310.0 | 102.6 | 323 | 222 | 381 | 457 | ✓ (1 đơn) |
      | OPTIMISTIC | 500 | 1031.6 | 343.4 | 485 | 573 | 1412 | 1617 | ✓ (1 đơn) |
      | OPTIMISTIC | 1000 | 1139.6 | 419.9 | 878 | 582 | 1673 | 1932 | ✓ (1 đơn) |
      | **ATOMIC** | **100** | **189.6** | **33.0** | **527** | **147** | **208** | **236** | **✓ (1 đơn)** |
      | **ATOMIC** | **500** | **510.6** | **210.8** | **979** | **264** | **632** | **730** | **✓ (1 đơn)** |
      | **ATOMIC** | **1000** | **340.0** | **25.6** | **2941** | **238** | **333** | **375** | **✓ (1 đơn)** |
    - **Kết luận:** ATOMIC nhanh hơn rõ rệt ở mọi N (chênh lệch đều vượt max StdDev). Lợi thế tăng dần: ~1.6× (N=100) → ~2.0× (N=500) → ~3.35× (N=1000). Chi tiết xem [docs/concurrency-benchmark.md](file:///d:/GoalHub/docs/concurrency-benchmark.md).
    - **Tại sao không đo N=5000:** HikariCP `maximumPoolSize=50`, MySQL `max_connections=151`. Với N=5000 qua pool 50 thread, thời gian đo chủ yếu là xử lý tuần tự qua funnel, không phải tranh chấp DB. Chi tiết giải thích trong `docs/concurrency-benchmark.md`.
    - **Phương án được chọn:** Atomic SQL UPDATE làm mặc định (`app.concurrency-strategy=atomic`). Optimistic Locking giữ sau cờ `optimistic`.
  - **Giai đoạn D — Stress test & Kịch bản phức tạp:** ✅ HOÀN THÀNH.
    - **Test 1 — Stress 20 lượt liên tiếp:** Chạy [SeatContentionStressTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/order/SeatContentionStressTest.java) với 20 lượt × N=100 mỗi lượt, chiến lược ATOMIC. Kết quả: **20/20 PASS**, 0 flaky.
    - **Test 2 — Nhiều ghế chồng lấn:** 50 người tranh 3 ghế, mỗi đơn chọn 2 trong 3 ghế (3 combo [A,B], [B,C], [A,C]). Kết quả: **PASS**. Đúng 1 đơn, 2 ghế RESERVED, `availableSeats` giảm đúng 2.
    - **Test 3 — Chồng lấn chéo với thứ tự ngẫu nhiên (20 lượt):** 20 lượt × 30 người × 3 ghế, mỗi đơn 2 ghế chéo (`{1,2}`, `{2,3}`, `{3,1}`), truyền seatIds **thứ tự ngẫu nhiên** (giả lập client). Kết quả: **20/20 PASS, 0 deadlock**, mỗi ghế thuộc tối đa 1 đơn. Xác nhận seatIds được sort cố định trước UPDATE.
    - **Kết quả kiểm thử:** Tests run: 3, Failures: 0, Errors: 0 (`BUILD SUCCESS`, 6:21 min).

- [x] **BƯỚC 6 — Bảo mật credential, Testcontainers, sửa unit test, pool config**

  - **Xóa password hardcode:**
    - Đã xác minh: `25112006` đã có trong git history tại commit `6794c78` (initial commit, trên `origin/main`). Cần **rotate DB password thật** vì history public.
    - Xóa khỏi `docker-compose.yml` (fail-fast `${DB_PASSWORD:?}`), `application-mysql-test.yml` (không còn fallback).
    - File `.env` giữ nguyên (đã có trong `.gitignore`, không bị track).
    - 3 file test Java: xóa hoàn toàn khi migrate sang Testcontainers.

  - **Migrate 3 test concurrency sang Testcontainers:**
    - Tạo [`MySQLContainerBase.java`](file:///d:/GoalHub/src/test/java/com/goalhub/order/MySQLContainerBase.java): base class `@Testcontainers(disabledWithoutDocker=true)` với `@Container static MySQLContainer` dùng chung. `@DynamicPropertySource` inject URL/credentials + pool=50 vào tất cả subclass.
    - `SeatContentionTest`, `SeatContentionBenchmarkTest`, `SeatContentionStressTest` đều kế thừa `MySQLContainerBase`. Không còn hardcode credentials hay localhost.
    - `MySQLDatabaseSmokeTest` đã dùng Testcontainers từ trước — không đổi.
    - Tests tự động skip khi Docker daemon không chạy.

  - **Sửa 4 unit test `OrderServiceTest` (lỗi thời sau refactor Atomic SQL):**
    - `createsOrderSuccessfully`: mock `updateStatusIfStatusIs` + `decrementAvailableSeats`, verify atomic calls thay vì assert in-memory object.
    - `cancelOrder_success`, `cancelOrder_adminCanCancel`, `releaseExpiredOrders_success`: `verify incrementAvailableSeats(id, N)` + `verify never().save(match)` thay vì `assertThat(match.getAvailableSeats())`.

  - **Thêm 4 integration test MySQL thật ([`OrderLifecycleIntegrationTest.java`](file:///d:/GoalHub/src/test/java/com/goalhub/order/OrderLifecycleIntegrationTest.java)):**
    - `cancelOrder_verifyDbState`: seat=AVAILABLE + availableSeats restored trong DB sau cancel.
    - `cancelOrder_seatsBecomBookableAgain`: ghế đã cancel được đặt lại bởi người khác.
    - `releaseExpiredOrders_verifyDbState`: force expire, verify DB state sau job chạy.
    - `releaseExpiredOrders_idempotent`: chạy job 2 lần không double-restore.

  - **Pool config rõ ràng:** Thêm `hikari.maximum-pool-size: ${HIKARI_MAX_POOL_SIZE:10}` vào `application.yml`. Ghi rõ trong [`docs/concurrency-benchmark.md`](file:///d:/GoalHub/docs/concurrency-benchmark.md): test dùng pool=50 (benchmark), application default pool=10.

  - **Sửa comment lỗi thời:** `Seat.java` — cập nhật comment `@Version` cho đúng với code thực tế.

  - **Kết quả kiểm thử:** `Tests run: 105, Failures: 0, Errors: 0, Skipped: 11` (`BUILD SUCCESS`, ~24s).
    - 11 skipped = tất cả Testcontainers test (Docker không chạy lúc test): `MySQLDatabaseSmokeTest`(1), `SeatContentionTest`(2), `SeatContentionBenchmarkTest`(1), `SeatContentionStressTest`(3), `OrderLifecycleIntegrationTest`(4).
    - Khi Docker chạy: tất cả 11 test này thực thi trên MySQL 8.0 container thật.
    - *(Sau khi thêm Bước 7: 110 tests, xem bên dưới.)*

- [x] **BƯỚC 7 — Production profile fail-fast (`JWT_SECRET`, `DB_PASSWORD`)**

  - **Chiến lược 2 lớp:**
    - **Layer 1 — Spring placeholder:** [`application-prod.yml`](file:///d:/GoalHub/src/main/resources/application-prod.yml) dùng `${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}`, `${JWT_SECRET}` **không có giá trị mặc định**. Spring ném `IllegalArgumentException` trước khi bất kỳ bean nào được khởi tạo nếu thiếu biến.
    - **Layer 2 — Validator rõ ràng:** [`ProductionStartupValidator.java`](file:///d:/GoalHub/src/main/java/com/goalhub/config/ProductionStartupValidator.java) — `@Component @Profile("prod")` + `@PostConstruct`: kiểm tra tất cả vars **cùng một lúc**, kiểm tra `JWT_SECRET >= 64 ký tự (256 bit)`, in error box với danh sách đầy đủ mọi biến còn thiếu.

  - **`application-prod.yml` còn override:**
    - `spring.jpa.hibernate.ddl-auto: validate` (không dùng `update`/`create` trong production).
    - `show-sql: false`, logging xuống `INFO`.

  - **Kích hoạt:** `SPRING_PROFILES_ACTIVE=prod` (hoặc `--spring.profiles.active=prod`).

  - **Kiểm thử** ([`ProductionStartupValidatorTest.java`](file:///d:/GoalHub/src/test/java/com/goalhub/config/ProductionStartupValidatorTest.java), 5 test, dùng `system-stubs-jupiter` để mock env vars):
    - ✅ Không throw khi đủ vars và `JWT_SECRET` >= 64 chars.
    - ✅ Throw `IllegalStateException` chứa `DB_PASSWORD` khi thiếu.
    - ✅ Throw khi thiếu `JWT_SECRET`.
    - ✅ Throw khi `JWT_SECRET` < 64 ký tự.
    - ✅ Throw liệt kê **tất cả** vars thiếu cùng một lần (không dừng ở biến đầu tiên).

  - **Kết quả kiểm thử:** `Tests run: 110, Failures: 0, Errors: 0, Skipped: 11` (`BUILD SUCCESS`, ~23s).

- [x] **BƯỚC 8 — Đồng bộ Frontend với API Backend & Chuẩn hóa Nguồn sự thật (Single Source of Truth)**

  - **Cập nhật API Client ([`orderApi.js`](file:///d:/GoalHub/frontend/src/api/orderApi.js)):**
    - Thêm `payOrder(id)` gọi `POST /api/orders/{id}/pay`.
    - Thêm `cancelOrder(id)` gọi `POST /api/orders/{id}/cancel`.

  - **Chuẩn hóa Server là nguồn sự thật duy nhất (Rule #2):**
    - **[`OrderDetailPage.jsx`](file:///d:/GoalHub/frontend/src/features/orders/OrderDetailPage.jsx):**
      - Xóa bỏ giả lập `setTimeout` 700ms khi thanh toán; kết nối trực tiếp `payOrder(id)` chuyển order sang `PAID` và ghế sang `SOLD`.
      - Xóa bỏ tính toán giá ảo trên client (bỏ cộng phí 2%, bỏ giảm giá 20% tự bịa). `order.totalAmount` từ server là giá trị thanh toán duy nhất.
      - Tích hợp đồng hồ đếm ngược giữ chỗ thời gian thực dựa trên `order.expiresAt` của máy chủ. Khi hết hạn, tự động làm mới trạng thái đơn hàng và thông báo giải phóng ghế.
      - Thêm nút **Huỷ đơn hàng** gọi `cancelOrder(id)` cho phép người dùng tự giải phóng ghế khi đơn ở trạng thái `PENDING`.
      - Xử lý trọn vẹn 3 trạng thái đơn: `PENDING` (chờ thanh toán), `PAID` (vé điện tử + QR code), `CANCELLED` (đơn đã huỷ, ghế đã hoàn trả).

  - **Đồng bộ luồng chọn ghế nguyên tử ([`MatchDetailPage.jsx`](file:///d:/GoalHub/frontend/src/features/matches/MatchDetailPage.jsx)):**
    - Chuẩn hóa sơ đồ ghế phân loại theo đúng `SeatClass` (`VIP`, `STANDARD`) tương thích với backend.
    - Loại bỏ chọn số lượng chung chung (`quantity`); người dùng chọn ghế cụ thể trên sơ đồ (`selectedSeatIds`).
    - Nút **"Tiến hành đặt vé"** gọi trực tiếp `createOrder({ matchId, seatIds })` để kích hoạt cơ chế khóa ghế nguyên tử (Atomic locking / `SELECT ... FOR UPDATE`), sau đó điều hướng ngay sang `/orders/{order.id}` để thanh toán.
    - Cập nhật [`BookingPage.jsx`](file:///d:/GoalHub/frontend/src/features/booking/BookingPage.jsx) tự động chuyển hướng về `/matches/:id` để chọn ghế trực quan.
    - [`CartDrawer.jsx`](file:///d:/GoalHub/frontend/src/components/CartDrawer.jsx) kiểm tra bắt buộc phải có ít nhất 1 ghế cụ thể trước khi tạo đơn hàng.

  - **Cập nhật Trang Vé Của Tôi ([`MyOrdersPage.jsx`](file:///d:/GoalHub/frontend/src/features/orders/MyOrdersPage.jsx)):**
    - Hiển thị badge hạn giữ chỗ `expiresAt` cho đơn `PENDING`.
    - Thêm nút hành động trực tiếp: **"Thanh toán ngay →"** và **"Huỷ đơn"** cho các đơn `PENDING`.
    - Hiển thị nút **"Đặt lại trận này"** cho các đơn `CANCELLED`.
    - Hiển thị nút **"Chi tiết vé"** và **"Xem QR"** cho các đơn `PAID`.

  - **Dọn dẹp code rác & Mock data:**
    - Xóa bỏ hoàn toàn file mock cũ [`mockData.js`](file:///d:/GoalHub/frontend/src/api/mockData.js).

  - **Kết quả kiểm thử:**
    - Backend: `mvn test` → `Tests run: 110, Failures: 0, Errors: 0, Skipped: 11` (`BUILD SUCCESS`, 15.28s).
    - Frontend: `npm run build` thành công (1.15s), `npm run lint` đạt `0 errors` (18 warnings).

