package com.goalhub.order;

import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.match.MatchStatus;
import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatRepository;
import com.goalhub.seat.SeatStatus;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import com.goalhub.order.dto.OrderRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for cancelOrder and releaseExpiredOrders on a real MySQL (InnoDB) database.
 *
 * <p>These tests verify that:
 * <ul>
 *   <li>After cancelOrder: seat status = AVAILABLE, availableSeats incremented correctly in DB.</li>
 *   <li>After releaseExpiredOrders: expired PENDING orders auto-cancelled, seats freed, availableSeats restored in DB.</li>
 * </ul>
 *
 * <p>Unit tests (OrderServiceTest) verify the mock interactions.
 * These integration tests verify the actual DB state, which unit tests cannot.
 */
class OrderLifecycleIntegrationTest extends MySQLContainerBase {

    @Autowired private OrderService orderService;
    @Autowired private MatchRepository matchRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    // ─── Shared helper ───────────────────────────────────────────────────────────

    private User createTestUser(String suffix) {
        return userRepository.save(User.builder()
                .email("lifecycle_test_" + suffix + "_" + System.nanoTime() + "@test.com")
                .fullName("Test User " + suffix)
                .role(Role.USER)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private Match createMatch(int totalSeats) {
        return matchRepository.saveAndFlush(Match.builder()
                .homeTeam("HomeTeam").awayTeam("AwayTeam")
                .venue("Test Stadium")
                .matchDate(LocalDateTime.now().plusDays(10))
                .status(MatchStatus.UPCOMING)
                .ticketPrice(BigDecimal.valueOf(100_000))
                .totalSeats(totalSeats)
                .availableSeats(totalSeats)
                .build());
    }

    private Seat createSeat(Match match, String code) {
        return seatRepository.saveAndFlush(Seat.builder()
                .match(match)
                .seatCode(code + "_" + System.nanoTime() % 100_000)
                .seatClass(SeatClass.STANDARD)
                .price(BigDecimal.valueOf(100_000))
                .status(SeatStatus.AVAILABLE)
                .version(0L)
                .build());
    }

    // ─── cancelOrder ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelOrder: seat status = AVAILABLE in DB, availableSeats incremented in DB")
    void cancelOrder_verifyDbState() {
        // Arrange
        Match match = createMatch(10);
        Seat seatA = createSeat(match, "CA-A");
        Seat seatB = createSeat(match, "CA-B");
        User buyer = createTestUser("cancel");

        // Book both seats
        var order = orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seatA.getId(), seatB.getId())), buyer);

        // Verify pre-cancel state in DB
        Match afterBook = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(afterBook.getAvailableSeats()).isEqualTo(8); // 10 - 2

        Seat afterBookA = seatRepository.findById(seatA.getId()).orElseThrow();
        Seat afterBookB = seatRepository.findById(seatB.getId()).orElseThrow();
        assertThat(afterBookA.getStatus()).isEqualTo(SeatStatus.RESERVED);
        assertThat(afterBookB.getStatus()).isEqualTo(SeatStatus.RESERVED);

        // Act: cancel
        orderService.cancelOrder(order.id(), buyer);

        // Assert DB state after cancel
        Seat cancelledA = seatRepository.findById(seatA.getId()).orElseThrow();
        Seat cancelledB = seatRepository.findById(seatB.getId()).orElseThrow();
        assertThat(cancelledA.getStatus())
                .as("Seat A must be AVAILABLE after cancel")
                .isEqualTo(SeatStatus.AVAILABLE);
        assertThat(cancelledB.getStatus())
                .as("Seat B must be AVAILABLE after cancel")
                .isEqualTo(SeatStatus.AVAILABLE);

        Match afterCancel = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(afterCancel.getAvailableSeats())
                .as("availableSeats must be restored to original value (10) after cancel")
                .isEqualTo(10);

        // Verify order status in DB
        Long cancelledOrderCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE id = ? AND status = 'CANCELLED'",
                Long.class, order.id());
        assertThat(cancelledOrderCount).isEqualTo(1L);
    }

    @Test
    @DisplayName("cancelOrder: after cancel, the same seats can be booked again by another user")
    void cancelOrder_seatsBecomBookableAgain() {
        Match match = createMatch(5);
        Seat seat = createSeat(match, "CB");
        User buyer1 = createTestUser("cancel-buyer1");
        User buyer2 = createTestUser("cancel-buyer2");

        var order1 = orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seat.getId())), buyer1);

        // buyer1 cancels
        orderService.cancelOrder(order1.id(), buyer1);

        // buyer2 should now be able to book the same seat
        var order2 = orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seat.getId())), buyer2);

        assertThat(order2.id()).isNotNull();
        Seat finalSeat = seatRepository.findById(seat.getId()).orElseThrow();
        assertThat(finalSeat.getStatus()).isEqualTo(SeatStatus.RESERVED);
    }

    // ─── releaseExpiredOrders ────────────────────────────────────────────────────

    @Test
    @DisplayName("releaseExpiredOrders: expired PENDING order freed in DB, seat = AVAILABLE, availableSeats restored")
    void releaseExpiredOrders_verifyDbState() throws Exception {
        // Arrange: book a seat with expiry in the past
        Match match = createMatch(10);
        Seat seat = createSeat(match, "EXP");
        User buyer = createTestUser("expire");

        var order = orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seat.getId())), buyer);

        // Force expire: set expires_at to the past directly in DB
        jdbcTemplate.update("UPDATE orders SET expires_at = ? WHERE id = ?",
                LocalDateTime.now().minusMinutes(1), order.id());

        // Verify seat is RESERVED before expiration job runs
        Seat beforeExpiry = seatRepository.findById(seat.getId()).orElseThrow();
        assertThat(beforeExpiry.getStatus()).isEqualTo(SeatStatus.RESERVED);

        Match beforeExpMatch = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(beforeExpMatch.getAvailableSeats()).isEqualTo(9); // 10 - 1

        // Act
        int released = orderService.releaseExpiredOrders();

        // Assert
        assertThat(released).as("1 order should have been released").isEqualTo(1);

        Seat afterExpiry = seatRepository.findById(seat.getId()).orElseThrow();
        assertThat(afterExpiry.getStatus())
                .as("Seat must be AVAILABLE after expiration job")
                .isEqualTo(SeatStatus.AVAILABLE);

        Match afterExpMatch = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(afterExpMatch.getAvailableSeats())
                .as("availableSeats must be restored to 10 after expiration job")
                .isEqualTo(10);

        Long cancelledCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE id = ? AND status = 'CANCELLED'",
                Long.class, order.id());
        assertThat(cancelledCount).isEqualTo(1L);
    }

    @Test
    @DisplayName("releaseExpiredOrders: idempotent — running twice does not double-restore availableSeats")
    void releaseExpiredOrders_idempotent() {
        Match match = createMatch(10);
        Seat seat = createSeat(match, "IDEM");
        User buyer = createTestUser("idem");

        var order = orderService.createOrder(
                new OrderRequest(match.getId(), List.of(seat.getId())), buyer);

        // Force expire
        jdbcTemplate.update("UPDATE orders SET expires_at = ? WHERE id = ?",
                LocalDateTime.now().minusMinutes(1), order.id());

        // Run twice
        int first = orderService.releaseExpiredOrders();
        int second = orderService.releaseExpiredOrders();

        assertThat(first).isEqualTo(1);
        assertThat(second).as("Second run should find nothing to release (idempotent)").isEqualTo(0);

        Match finalMatch = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(finalMatch.getAvailableSeats())
                .as("availableSeats must be exactly 10, not 11 (no double restore)")
                .isEqualTo(10);
    }
}
