# GoalHub – Toàn Diện Dự Án (Backend & Frontend Walkthrough)

> Cập nhật trạng thái hệ thống: **Tháng 10/2026**  
> Dự án: Nền tảng đặt vé bóng đá trực tuyến GoalHub (Full-stack: Spring Boot 3 + MySQL + React 19 Vite)

---

## 1. Trạng Thái Build & Kiểm Thử Hiện Tại

### 1.1. Backend (Spring Boot 3.3.4 + Java 17)
- **Maven Test Result**: `BUILD SUCCESS` (Tổng thời gian: ~23s)
- **Test Coverage**: **94/94** tests đạt 100%, 0 failures, 0 errors.

| Module | Unit Tests (Service / Logic) | Integration Tests (Controller / MockMvc) | Tổng số Test | Trạng Thái |
|---|---|---|---|---|
| **Auth** | - | 4 | 4 | ✅ Passed |
| **Config (Seeder)** | 1 | - | 1 | ✅ Passed |
| **Match** | 10 | 13 | 23 | ✅ Passed |
| **Seat** | 8 | 11 | 19 | ✅ Passed |
| **Order** | 23 | 24 | 47 | ✅ Passed |
| **Tổng cộng** | **42** | **52** | **94** | ✅ **BUILD SUCCESS** |

### 1.2. Frontend (React 19 + Vite 8.3 + TailwindCSS v4)
- **Vite Build**: `npm run build` hoàn thành thành công trong **1.13s** (`dist/` sẵn sàng production).
- **Linter**: `oxlint` 0 errors.
- **Proxy**: `/api` được cấu hình chuyển tiếp tự động sang `http://localhost:8080`.

---

## 2. Kiến Trúc Cơ Sở Dữ Liệu & Entity Relationship (ERD)

GoalHub sử dụng **MySQL** cho môi trường chạy ứng dụng (`goalhub` DB) và **H2** (`MODE=MySQL`) cho môi trường Unit / Integration Test.

```
users
├── id: BIGINT AUTO_INCREMENT (PK)
├── email: VARCHAR(255) UNIQUE NOT NULL
├── password: VARCHAR(255) NOT NULL (BCrypt hashed)
├── full_name: VARCHAR(255) NOT NULL
├── role: VARCHAR(50) NOT NULL (USER | ADMIN)
├── created_at: DATETIME
└── updated_at: DATETIME

matches
├── id: BIGINT AUTO_INCREMENT (PK)
├── home_team: VARCHAR(255) NOT NULL
├── away_team: VARCHAR(255) NOT NULL
├── match_date: DATETIME NOT NULL
├── venue: VARCHAR(255) NOT NULL
├── status: VARCHAR(50) NOT NULL (UPCOMING | ONGOING | COMPLETED | CANCELLED)
├── total_seats: INT NOT NULL
├── available_seats: INT NOT NULL
├── ticket_price: DECIMAL(12,0) NOT NULL  ← Giá từ (giá sàn hiển thị)
├── created_at: DATETIME
└── updated_at: DATETIME

seats
├── id: BIGINT AUTO_INCREMENT (PK)
├── match_id: BIGINT NOT NULL (FK -> matches.id)
├── seat_code: VARCHAR(50) NOT NULL
├── seat_class: VARCHAR(50) NOT NULL (VIP | STANDARD)
├── price: DECIMAL(12,0) NOT NULL  ← Nguồn sự thật duy nhất về giá vé
├── status: VARCHAR(50) NOT NULL (AVAILABLE | RESERVED | SOLD)
├── version: BIGINT
├── created_at: DATETIME
└── updated_at: DATETIME
CONSTRAINT: UNIQUE (match_id, seat_code)

orders
├── id: BIGINT AUTO_INCREMENT (PK)
├── user_id: BIGINT NOT NULL (FK -> users.id)
├── match_id: BIGINT NOT NULL (FK -> matches.id)
├── total_amount: DECIMAL(14,0) NOT NULL  ← Server tính từ tổng giá ghế
├── status: VARCHAR(50) NOT NULL (PENDING | PAID | CANCELLED)
├── expires_at: DATETIME NOT NULL  ← Hạn giữ chỗ (server-side source of truth)
├── created_at: DATETIME
└── updated_at: DATETIME

order_items
├── id: BIGINT AUTO_INCREMENT (PK)
├── order_id: BIGINT NOT NULL (FK -> orders.id, CASCADE DELETE)
├── seat_id: BIGINT NOT NULL (FK -> seats.id)
└── price_at_booking: DECIMAL(12,0) NOT NULL  ← Lưu vết giá ghế tại thời điểm đặt (VND)
```

### Cơ chế Khởi tạo Dữ liệu Mẫu (Data Seeder)
Khi khởi động ứng dụng trong profile `dev` (`@Profile("dev")`) và bảng `users` rỗng, [DataSeeder.java](file:///d:/GoalHub/src/main/java/com/goalhub/config/DataSeeder.java) tự động tạo:
- **Tài khoản mặc định (chỉ dev profile)**:
  - `user@goalhub.vn` / `password` (Role: `USER`, Tên: Nguyễn Văn An)
  - `admin@goalhub.vn` / `admin123` (Role: `ADMIN`, Tên: Admin GoalHub)
- **9 trận đấu mẫu**: Các trận đấu tiêu biểu của V.League 1, Cúp Quốc Gia (Hà Nội FC, Viettel, TP.HCM, HAGL, v.v.).
- **160 ghế/trận**: 3 hàng VIP (VIP-A, VIP-B, VIP-C × 20 ghế) và 5 hàng Standard (D, E, F, G, H × 20 ghế) với trạng thái ngẫu nhiên mô phỏng thực tế.

---

## 3. Danh Mục REST API Backend

Hệ thống bảo mật sử dụng **Spring Security 6** với JWT Stateless Token qua Filter [JwtAuthFilter.java](file:///d:/GoalHub/src/main/java/com/goalhub/security/JwtAuthFilter.java).

### 3.1. Authentication & User Profile
| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản (luôn luôn gán Role `USER`, ngăn chặn escalation) |
| `POST` | `/api/auth/login` | Public | Đăng nhập với email + mật khẩu, trả về JWT Token |
| `GET` | `/api/auth/me` | Authenticated | Lấy thông tin user hiện tại qua Token |
| `GET` | `/api/users/me` | Authenticated | Lấy chi tiết hồ sơ người dùng (`UserResponse`) |

### 3.2. Quản Lý Trận Đấu (Matches)
| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `GET` | `/api/matches` | Public | Danh sách trận đấu phân trang (hỗ trợ `?status=UPCOMING`, `?page=`, `?size=`) |
| `GET` | `/api/matches/{id}` | Public | Chi tiết 1 trận đấu cụ thể |
| `POST` | `/api/matches` | `ADMIN` | Tạo mới trận đấu |
| `PUT` | `/api/matches/{id}` | `ADMIN` | Cập nhật thông tin trận đấu |
| `DELETE` | `/api/matches/{id}` | `ADMIN` | Xóa trận đấu |

### 3.3. Sơ Đồ Ghế (Seats)
| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `GET` | `/api/matches/{matchId}/seats` | Public | Lấy toàn bộ danh sách ghế của trận đấu |
| `POST` | `/api/matches/{matchId}/seats/bulk` | `ADMIN` | Tạo hàng loạt ghế (Bulk create), tự động cập nhật `totalSeats` và `availableSeats` của trận |

### 3.4. Đặt Vé & Đơn Hàng (Orders)
| Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `POST` | `/api/orders` | Authenticated | Khởi tạo đơn đặt vé (truyền `matchId` và mảng `seatIds`, tính `expires_at`) |
| `GET` | `/api/orders/my` | Authenticated | Xem danh sách đơn vé của người dùng hiện tại (phân trang, summary) |
| `GET` | `/api/orders/{id}` | Owner hoặc `ADMIN` | Xem chi tiết đơn vé kèm danh sách `orderItems` và giá snapshot |
| `POST` | `/api/orders/{id}/pay` | Owner hoặc `ADMIN` | Thanh toán đơn: đơn `PENDING` → `PAID`, ghế `RESERVED` → `SOLD` (từ chối nếu đã quá hạn) |
| `POST` | `/api/orders/{id}/cancel` | Owner hoặc `ADMIN` | Huỷ đơn: đơn → `CANCELLED`, ghế `RESERVED` → `AVAILABLE`, hoàn lại `availableSeats` |

#### Quy tắc nghiệp vụ vòng đời đơn hàng:
1. **Tạo đơn (`createOrder`):**
   - Đặt `expires_at` = thời điểm tạo + `app.order.hold-duration-minutes` (mặc định 10 phút, server-side truth).
   - Đổi trạng thái các ghế sang `RESERVED`, giảm `availableSeats` của trận, tạo `Order` trạng thái `PENDING`.
2. **Thanh toán (`payOrder`):**
   - Chỉ chủ đơn hoặc `ADMIN` được thanh toán.
   - Kiểm tra nếu quá `expires_at`: tự động chuyển `CANCELLED`, nhả ghế về `AVAILABLE`, hoàn `availableSeats`, từ chối thanh toán (`400 Bad Request`).
   - Thành công: `Order` → `PAID`, ghế → `SOLD`.
3. **Huỷ đơn (`cancelOrder`):**
   - Chỉ chủ đơn hoặc `ADMIN` được huỷ khi đơn còn `PENDING`.
   - `Order` → `CANCELLED`, ghế `RESERVED` → `AVAILABLE`, cộng hoàn lại `availableSeats`.
4. **Quét hết hạn tự động (`OrderExpirationJob`):**
   - Chạy định kỳ mỗi 30s (`@Scheduled(fixedDelay = 30000)`).
   - Tìm tất cả đơn `PENDING` có `expires_at < now`, tự động chuyển sang `CANCELLED`, hoàn trả ghế về `AVAILABLE` và khôi phục `availableSeats`.
   - Cơ chế bảo đảm tính Idempotent (không huỷ trùng, không hoàn ghế lặp).

---

## 4. Kiến Trúc & Tính Năng Frontend

Giao diện được xây dựng với phong cách thiết kế hiện đại, gam màu tối thể thao với điểm nhấn Neon Green (`#39ff14`), typography Barlow + Inter, hỗ trợ responsive hoàn toàn.

### 4.1. Hệ Thống State & Quản Lý Dữ Liệu
1. **[AuthContext.jsx](file:///d:/GoalHub/frontend/src/context/AuthContext.jsx)**:
   - Quản lý trạng thái đăng nhập, giải mã thông tin user, phân quyền `isAdmin`, lưu trữ JWT an toàn tại `localStorage`.
2. **[CartContext.jsx](file:///d:/GoalHub/frontend/src/context/CartContext.jsx)**:
   - Quản lý giỏ hàng toàn cục với ngăn kéo trượt (Sliding Drawer).
   - **Bộ đếm ngược giữ vé 10 phút (Hold Timer)**: Tự động đếm lùi, có cảnh báo khi sắp hết giờ và tự động giải phóng vé nếu quá hạn.
   - **Sản phẩm phụ kiện kèm theo (Add-ons)**: Khăn cổ vũ ĐT Việt Nam, Áo đấu 2026, Combo Bắp nước, Bảo hiểm hoàn vé 100%.
   - **Hệ thống mã giảm giá (Promo Codes)**:
     - `GOALVN20`: Giảm 20% giá trị tiền vé.
     - `FREESHIPFEE`: Miễn phí 100% phí xử lý giao dịch 2%.
     - `NEWFAN`: Giảm 10% cho thành viên mới.
3. **[axiosInstance.js](file:///d:/GoalHub/frontend/src/api/axiosInstance.js)**:
   - Tự động gắn token `Bearer <jwt>` vào header request.
   - Bắt lỗi HTTP 401 tự động chuyển hướng về trang đăng nhập.

---

### 4.2. Sơ Đồ Điều Hướng & Các Trang Ứng Dụng

| Đường dẫn (URL) | Component | Quyền hạn | Mô tả tính năng |
|---|---|---|---|
| `/` | [MatchListPage.jsx](file:///d:/GoalHub/frontend/src/features/matches/MatchListPage.jsx) | Public | **Trang chủ GoalTicket**: Thanh điểm số trực tiếp (Live Ticker), Hero Banner đếm ngược trận tâm điểm, danh mục trận đấu hot, highlight trận sắp diễn ra. |
| `/lich-dau` | [MatchListPage.jsx](file:///d:/GoalHub/frontend/src/features/matches/MatchListPage.jsx) | Public | **Lịch thi đấu & Tìm kiếm**: Bộ lọc đa chiều (tìm theo từ khóa, giải đấu V.League/AFF Cup, sân vận động, tầm giá vé, sắp xếp theo độ hot/giá/ngày). |
| `/tin-tuc` | [NewsPage.jsx](file:///d:/GoalHub/frontend/src/features/news/NewsPage.jsx) | Public | **Trang tin tức thể thao**: Tin nóng chuyển nhượng, tiêu điểm vòng đấu, phân tích chiến thuật và widget đặt vé nhanh. |
| `/matches/:id` | [MatchDetailPage.jsx](file:///d:/GoalHub/frontend/src/features/matches/MatchDetailPage.jsx) | Public | **Chi tiết trận đấu & Sơ đồ ghế**: Xem thông tin đội hình, địa điểm, chọn ghế trực tiếp trên [SeatMap.jsx](file:///d:/GoalHub/frontend/src/components/SeatMap.jsx) theo phân hạng VIP/Standard, thêm nhanh vào giỏ hàng. |
| `/booking/:id` | [BookingPage.jsx](file:///d:/GoalHub/frontend/src/features/booking/BookingPage.jsx) | Authenticated | **Quy trình đặt vé 3 bước (Booking Wizard)**: Bước 1: Chọn khán đài/sơ đồ sân (Bắc, Nam, Đông, Tây, VIP) và số lượng vé; Bước 2: Điền thông tin cá nhân (CCCD, Họ tên, SĐT); Bước 3: Xác nhận, đồng hồ giữ chỗ 15 phút, xem mẫu E-Ticket và chọn cổng thanh toán. |
| `/login` | [LoginPage.jsx](file:///d:/GoalHub/frontend/src/features/auth/LoginPage.jsx) | Public | **Đăng nhập**: Thiết kế sang trọng, tích hợp phím tắt đăng nhập nhanh 1-click cho tài khoản Demo (`user@goalhub.vn`, `admin@goalhub.vn`). |
| `/register` | [RegisterPage.jsx](file:///d:/GoalHub/frontend/src/features/auth/RegisterPage.jsx) | Public | **Đăng ký tài khoản mới**: Form kiểm tra hợp lệ thông tin, tạo tài khoản và chuyển hướng tự động. |
| `/profile` | [ProfilePage.jsx](file:///d:/GoalHub/frontend/src/features/profile/ProfilePage.jsx) | Authenticated | **Hồ sơ thành viên**: Thẻ hội viên Member Card hiệu ứng gradient, thống kê số lượng vé đã đặt, liên kết nhanh đến bảo mật & vé của tôi. |
| `/orders/my` | [MyOrdersPage.jsx](file:///d:/GoalHub/frontend/src/features/orders/MyOrdersPage.jsx) | Authenticated | **Vé của tôi**: Danh sách đơn vé đã đặt phân chia theo trạng thái Đã thanh toán / Chờ xử lý / Đã hủy, nút tải hóa đơn và xem vé QR. |
| `/orders/:id` | [OrderDetailPage.jsx](file:///d:/GoalHub/frontend/src/features/orders/OrderDetailPage.jsx) | Authenticated | **Chi tiết đơn vé & Check-in QR**: Vé điện tử E-Ticket với mã QR quét tại cổng sân vận động, chi tiết ghế, giá vé snapshot, mô phỏng thanh toán trực tuyến (VNPay, MoMo, ZaloPay). |
| `/admin/matches` | [ManageMatchesPage.jsx](file:///d:/GoalHub/frontend/src/features/admin/ManageMatchesPage.jsx) | Admin | **Quản lý trận đấu**: Bảng điều khiển CRUD trận đấu, tìm kiếm, lọc theo trạng thái, mở modal thêm/sửa trận đấu. |
| `/admin/matches/:id/seats` | [ManageSeatsPage.jsx](file:///d:/GoalHub/frontend/src/features/admin/ManageSeatsPage.jsx) | Admin | **Quản lý & Khởi tạo ghế hàng loạt**: Công cụ sinh mã ghế tự động theo hàng (A1..A20), chọn phân hạng & giá, xem trước trực quan trên sơ đồ ghế. |

---

### 4.3. Các Component Trải Nghiệm Người Dùng Đặc Sắc

- **[Navbar.jsx](file:///d:/GoalHub/frontend/src/components/Navbar.jsx) + Live Ticker**:
  - Dải thanh chạy Marquee đầu trang liên tục cập nhật tỷ số trực tiếp các trận đấu đang diễn ra kèm phút thi đấu thực tế (`67'`, `KT`).
  - Nút giỏ hàng nổi kèm biểu tượng badge hiển thị tức thì số lượng vé/phụ kiện đang chọn.
- **[CartDrawer.jsx](file:///d:/GoalHub/frontend/src/components/CartDrawer.jsx)**:
  - Ngăn kéo trượt bên phải hiển thị danh sách vé đã chọn, thời gian giữ vé còn lại, các gói phụ kiện tùy chọn, ô nhập mã giảm giá và tính toán tổng tiền minh bạch.
- **[SocialProofToast.jsx](file:///d:/GoalHub/frontend/src/components/SocialProofToast.jsx)**:
  - Thông báo nổi góc trái định kỳ mô phỏng lượt mua vé thực tế của người dùng ("Anh Hoàng vừa đặt 2 vé VIP...", "Chị Mai vừa áp dụng mã GOALVN20..."), tạo hiệu ứng tương tác sôi động cho trang bán vé.
- **[SeatMap.jsx](file:///d:/GoalHub/frontend/src/components/SeatMap.jsx)**:
  - Lưới hiển thị ghế trực quan với chú thích rõ ràng: Có thể chọn (Available), Đang chọn (Selected), Đang giữ chỗ (Reserved), Đã bán (Sold).

---

## 5. Hướng Dẫn Vận Hành & Trải Nghiệm Thực Tế

### 5.1. Khởi chạy Hạ tầng Dịch vụ (Docker Compose)
Dự án đã trang bị sẵn tệp [docker-compose.yml](file:///d:/GoalHub/docker-compose.yml) chứa đầy đủ **MySQL 8.0** và **Redis 7**:
```bash
docker compose up -d
```
Lệnh này sẽ tự động khởi động:
- `goalhub-mysql`: MySQL 8.0 (cổng 3306), volume lưu trữ `mysql_data`, database `goalhub`.
- `goalhub-redis`: Redis 7 Alpine (cổng 6379), sẵn sàng cho cơ chế khóa phân tán / giữ chỗ tạm thời (TTL).

### 5.2. Khởi chạy Backend (Spring Boot)
1. Chạy ứng dụng Spring Boot:
   ```bash
   mvn spring-boot:run
   ```
   Ứng dụng sẽ tự động kích hoạt seeder (khi ở profile `dev`) tạo dữ liệu mẫu và lắng nghe tại `http://localhost:8080`.

2. Chạy bộ kiểm thử (Test Suite):
   ```bash
   mvn test
   ```
   Toàn bộ các unit/slice tests chạy trên H2 siêu nhanh. Khi Docker daemon được kích hoạt, bài test [MySQLDatabaseSmokeTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/infrastructure/MySQLDatabaseSmokeTest.java) sẽ tự động khởi tạo MySQL container thật qua Testcontainers để xác minh tính tương thích và cơ chế InnoDB.

### 5.3. Khởi chạy Frontend (React Vite)
1. Cài đặt thư viện & chạy máy chủ phát triển:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Mở trình duyệt tại: `http://localhost:5173`.

### 5.4. Tài Khoản Demo Sẵn Sàng
- **Người dùng phổ thông**: `user@goalhub.vn` / Mật khẩu: `password` (Trải nghiệm duyệt vé, chọn ghế, quy trình đặt vé và thanh toán).
- **Quản trị viên (Admin)**: `admin@goalhub.vn` / Mật khẩu: `admin123` (Trải nghiệm tạo trận đấu mới, cập nhật tỷ số/trạng thái và sinh sơ đồ ghế hàng loạt).

---

## 6. Cơ Chế Chống Đặt Trùng Ghế (Seat Contention — Phần Lõi Dự Án)

> **Bài toán:** Nhiều người cùng đặt một ghế mà không bán trùng và không làm treo hệ thống.

### 6.1. Vấn đề và Chứng minh

Trước khi có cơ chế khóa, hệ thống gặp lỗi **Check-Then-Act** (đọc `status == AVAILABLE` không có khóa) và **Lost Update** (trừ `availableSeats` theo kiểu đọc-rồi-ghi). Test [SeatContentionTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/order/SeatContentionTest.java) chứng minh: **2 đơn hàng cùng tạo thành công cho 1 ghế** + **12 deadlock**.

### 6.2. Hai Giải pháp Đã Cài Đặt

| Chiến lược | Cơ chế | Cấu hình |
|---|---|---|
| **Atomic SQL UPDATE** (mặc định) | `UPDATE seats SET status='RESERVED' WHERE id IN (…) AND status='AVAILABLE'` — 1 câu SQL, DB tự serialize | `app.concurrency-strategy=atomic` |
| Optimistic Locking | JPA `@Version` trên `Seat.version` — đọc → ghi → kiểm version | `app.concurrency-strategy=optimistic` |

Cập nhật `availableSeats` cũng dùng atomic SQL cho cả 2 phương án: `UPDATE matches SET available_seats = available_seats - ? WHERE available_seats >= ?`.

### 6.3. Kết Quả Benchmark (MySQL 9.3.0, HikariCP pool=50, i7-10850H)

Chỉ đo **contest window** (từ lúc thả N luồng đồng thời đến khi tất cả xong), 5 runs/config:

| Phương án | N | TB (ms) | Throughput (req/s) | p50 (ms) | p95 (ms) | p99 (ms) |
|---|---|---|---|---|---|---|
| OPTIMISTIC | 100 | 348 | 287 | 208 | 376 | 442 |
| OPTIMISTIC | 500 | 660 | 757 | 339 | 843 | 989 |
| **ATOMIC** | **100** | **109** | **921** | **68** | **153** | **162** |
| **ATOMIC** | **500** | **208** | **2406** | **135** | **242** | **255** |

**Kết luận:** ATOMIC nhanh hơn rõ rệt (~3.2× throughput). Chi tiết: [docs/concurrency-benchmark.md](file:///d:/GoalHub/docs/concurrency-benchmark.md).

### 6.4. Stress Test & Kịch Bản Phức Tạp

Chạy qua [SeatContentionStressTest.java](file:///d:/GoalHub/src/test/java/com/goalhub/order/SeatContentionStressTest.java):

- **20 lượt liên tiếp × N=100**: **20/20 PASS**, 0 flaky.
- **50 người tranh 3 ghế, mỗi đơn 2 ghế chồng lấn**: **PASS**. Đúng 1 đơn, 2 ghế RESERVED, `availableSeats` giảm đúng 2.

### 6.5. Kiểm thử Rollback Nguyên Tử

Đặt 3 ghế [A, B, C] mà ghế B đã bị đặt trước → **toàn bộ đơn rollback 100%**. Ghế A và C vẫn AVAILABLE, không ghế nào bị giữ nửa chừng.
