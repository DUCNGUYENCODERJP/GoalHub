package com.goalhub.order;

import com.goalhub.exception.BusinessException;
import com.goalhub.exception.ResourceNotFoundException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderServiceImpl – Unit Tests")
class OrderServiceTest {

    @Mock private OrderRepository  orderRepository;
    @Mock private MatchRepository  matchRepository;
    @Mock private SeatRepository   seatRepository;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User userA;
    private User admin;
    private Match match;
    private Seat seat1;
    private Seat seat2;

    @BeforeEach
    void setUp() {
        userA = User.builder().id(1L).email("user@test.com").fullName("User A")
                .role(Role.USER).password("pass")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        admin = User.builder().id(99L).email("admin@test.com").fullName("Admin")
                .role(Role.ADMIN).password("pass")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        match = Match.builder()
                .id(1L).homeTeam("Man Utd").awayTeam("Liverpool")
                .matchDate(LocalDateTime.now().plusDays(7))
                .venue("Old Trafford").status(MatchStatus.UPCOMING)
                .totalSeats(1000).availableSeats(1000)
                .ticketPrice(new BigDecimal("100.00"))
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        seat1 = Seat.builder().id(10L).match(match).seatCode("A1")
                .seatClass(SeatClass.STANDARD).price(new BigDecimal("100.00"))
                .status(SeatStatus.AVAILABLE).version(0L)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        seat2 = Seat.builder().id(11L).match(match).seatCode("A2")
                .seatClass(SeatClass.STANDARD).price(new BigDecimal("100.00"))
                .status(SeatStatus.AVAILABLE).version(0L)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
    }

    // ─── createOrder ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("createOrder()")
    class CreateOrder {

        @Test
        @DisplayName("creates order, atomic SQL marks seats RESERVED, decrements availableSeats")
        void createsOrderSuccessfully() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
            when(seatRepository.findAllById(List.of(10L, 11L))).thenReturn(List.of(seat1, seat2));
            // Atomic branch: updateStatusIfStatusIs returns number of rows updated (= seat count)
            when(seatRepository.updateStatusIfStatusIs(
                    List.of(10L, 11L), SeatStatus.AVAILABLE, SeatStatus.RESERVED)).thenReturn(2);
            // Atomic branch: decrementAvailableSeats returns 1 (success)
            when(matchRepository.decrementAvailableSeats(1L, 2)).thenReturn(1);

            Order savedOrder = Order.builder()
                    .id(100L).user(userA).match(match)
                    .totalAmount(new BigDecimal("200.00"))
                    .status(OrderStatus.PENDING)
                    .items(List.of(
                            OrderItem.builder().id(1L).seat(seat1)
                                    .priceAtBooking(new BigDecimal("100.00")).build(),
                            OrderItem.builder().id(2L).seat(seat2)
                                    .priceAtBooking(new BigDecimal("100.00")).build()
                    ))
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .build();

            when(orderRepository.save(any())).thenReturn(savedOrder);
            when(orderRepository.findByIdWithItems(100L)).thenReturn(Optional.of(savedOrder));

            OrderRequest request = new OrderRequest(1L, List.of(10L, 11L));
            OrderResponse response = orderService.createOrder(request, userA);

            assertThat(response.id()).isEqualTo(100L);
            assertThat(response.totalAmount()).isEqualByComparingTo("200.00");
            assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
            assertThat(response.items()).hasSize(2);

            // Atomic strategy: seat status is updated directly in DB via SQL, not via entity mutation.
            // Verify the atomic SQL methods were called with correct args.
            verify(seatRepository).updateStatusIfStatusIs(
                    List.of(10L, 11L), SeatStatus.AVAILABLE, SeatStatus.RESERVED);
            verify(matchRepository).decrementAvailableSeats(1L, 2);
            // Order is persisted
            verify(orderRepository).save(any(Order.class));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when match not found")
        void throwsWhenMatchNotFound() {
            when(matchRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                orderService.createOrder(new OrderRequest(99L, List.of(10L)), userA))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Match");
        }

        @Test
        @DisplayName("throws BusinessException when seat IDs are duplicated")
        void throwsOnDuplicateSeatIds() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(match));

            assertThatThrownBy(() ->
                orderService.createOrder(new OrderRequest(1L, List.of(10L, 10L)), userA))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Duplicate seat IDs");
        }

        @Test
        @DisplayName("throws BusinessException when a seat is not found")
        void throwsWhenSeatNotFound() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
            // Only seat1 found, seat 999 missing
            when(seatRepository.findAllById(List.of(10L, 999L))).thenReturn(List.of(seat1));

            assertThatThrownBy(() ->
                orderService.createOrder(new OrderRequest(1L, List.of(10L, 999L)), userA))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not found")
                .hasMessageContaining("999");
        }

        @Test
        @DisplayName("throws BusinessException when seat belongs to different match")
        void throwsWhenSeatBelongsToDifferentMatch() {
            Match otherMatch = Match.builder().id(2L).homeTeam("X").awayTeam("Y")
                    .matchDate(LocalDateTime.now().plusDays(3))
                    .venue("Stadium").status(MatchStatus.UPCOMING)
                    .totalSeats(100).availableSeats(100)
                    .ticketPrice(new BigDecimal("50.00"))
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
            Seat wrongSeat = Seat.builder().id(20L).match(otherMatch).seatCode("B1")
                    .seatClass(SeatClass.STANDARD).price(new BigDecimal("50.00"))
                    .status(SeatStatus.AVAILABLE).version(0L)
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

            when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
            when(seatRepository.findAllById(List.of(20L))).thenReturn(List.of(wrongSeat));

            assertThatThrownBy(() ->
                orderService.createOrder(new OrderRequest(1L, List.of(20L)), userA))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("do not belong to match");
        }

        @Test
        @DisplayName("throws BusinessException when seat is not AVAILABLE")
        void throwsWhenSeatNotAvailable() {
            seat1.setStatus(SeatStatus.RESERVED);
            when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
            when(seatRepository.findAllById(List.of(10L))).thenReturn(List.of(seat1));

            assertThatThrownBy(() ->
                orderService.createOrder(new OrderRequest(1L, List.of(10L)), userA))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available")
                .hasMessageContaining("10");
        }
    }

    // ─── getMyOrders ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getMyOrders()")
    class GetMyOrders {

        @Test
        @DisplayName("returns paginated orders for current user")
        void returnsPaginatedOrders() {
            Order o = Order.builder().id(1L).user(userA).match(match)
                    .totalAmount(new BigDecimal("100.00")).status(OrderStatus.PENDING)
                    .items(List.of()).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

            when(orderRepository.findByUserIdOrderByCreatedAtDesc(eq(1L), any()))
                    .thenReturn(new PageImpl<>(List.of(o)));

            Page<OrderResponse> result = orderService.getMyOrders(userA, PageRequest.of(0, 20));

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).userId()).isEqualTo(1L);
        }
    }

    // ─── getOrderById ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getOrderById()")
    class GetOrderById {

        private Order order;

        @BeforeEach
        void setupOrder() {
            order = Order.builder().id(1L).user(userA).match(match)
                    .totalAmount(new BigDecimal("100.00")).status(OrderStatus.PENDING)
                    .items(List.of()).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        }

        @Test
        @DisplayName("owner can view own order")
        void ownerCanViewOrder() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(order));

            OrderResponse response = orderService.getOrderById(1L, userA);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.userId()).isEqualTo(userA.getId());
        }

        @Test
        @DisplayName("ADMIN can view any order")
        void adminCanViewAnyOrder() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(order));

            OrderResponse response = orderService.getOrderById(1L, admin);

            assertThat(response.id()).isEqualTo(1L);
        }

        @Test
        @DisplayName("throws AccessDeniedException when non-owner USER tries to view order")
        void nonOwnerCannotViewOrder() {
            User otherUser = User.builder().id(2L).email("other@test.com")
                    .fullName("Other").role(Role.USER).password("pass")
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(order));

            assertThatThrownBy(() -> orderService.getOrderById(1L, otherUser))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when order not found")
        void throwsWhenOrderNotFound() {
            when(orderRepository.findByIdWithItems(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.getOrderById(99L, userA))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Order");
        }
    }

    // ─── payOrder ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("payOrder()")
    class PayOrder {

        private Order pendingOrder;

        @BeforeEach
        void setUp() {
            seat1.setStatus(SeatStatus.RESERVED);
            seat2.setStatus(SeatStatus.RESERVED);

            pendingOrder = Order.builder()
                    .id(1L)
                    .user(userA)
                    .match(match)
                    .totalAmount(new BigDecimal("200.00"))
                    .status(OrderStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .items(new java.util.ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            pendingOrder.addItem(OrderItem.builder().id(101L).seat(seat1).priceAtBooking(seat1.getPrice()).build());
            pendingOrder.addItem(OrderItem.builder().id(102L).seat(seat2).priceAtBooking(seat2.getPrice()).build());
        }

        @Test
        @DisplayName("successful payment transitions order to PAID and seats to SOLD")
        void payOrder_success() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            OrderResponse response = orderService.payOrder(1L, userA);

            assertThat(response.status()).isEqualTo(OrderStatus.PAID);
            assertThat(pendingOrder.getStatus()).isEqualTo(OrderStatus.PAID);
            assertThat(seat1.getStatus()).isEqualTo(SeatStatus.SOLD);
            assertThat(seat2.getStatus()).isEqualTo(SeatStatus.SOLD);
            verify(seatRepository, times(2)).save(any(Seat.class));
            verify(orderRepository).save(pendingOrder);
        }

        @Test
        @DisplayName("paying an expired order auto-cancels order, releases seats, and throws BusinessException")
        void payOrder_expired_autoCancelsAndRejects() {
            pendingOrder.setExpiresAt(LocalDateTime.now().minusMinutes(1)); // expired!
            match.setAvailableSeats(998); // 1000 - 2

            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            assertThatThrownBy(() -> orderService.payOrder(1L, userA))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("expired");

            assertThat(pendingOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            assertThat(seat1.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            assertThat(seat2.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            assertThat(match.getAvailableSeats()).isEqualTo(1000); // 998 + 2 restored
            verify(seatRepository, times(2)).save(any(Seat.class));
            verify(matchRepository).save(match);
            verify(orderRepository).save(pendingOrder);
        }

        @Test
        @DisplayName("paying non-PENDING order throws BusinessException")
        void payOrder_notPending_throws() {
            pendingOrder.setStatus(OrderStatus.PAID);
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));

            assertThatThrownBy(() -> orderService.payOrder(1L, userA))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("PENDING");
        }

        @Test
        @DisplayName("non-owner cannot pay for someone else's order (throws AccessDeniedException)")
        void payOrder_nonOwner_throwsAccessDenied() {
            User userB = User.builder().id(2L).email("userb@test.com").role(Role.USER).build();
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));

            assertThatThrownBy(() -> orderService.payOrder(1L, userB))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("ADMIN can pay on behalf of user")
        void payOrder_adminCanPay() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            OrderResponse response = orderService.payOrder(1L, admin);

            assertThat(response.status()).isEqualTo(OrderStatus.PAID);
            assertThat(seat1.getStatus()).isEqualTo(SeatStatus.SOLD);
        }
    }

    // ─── cancelOrder ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("cancelOrder()")
    class CancelOrder {

        private Order pendingOrder;

        @BeforeEach
        void setUp() {
            seat1.setStatus(SeatStatus.RESERVED);
            seat2.setStatus(SeatStatus.RESERVED);
            match.setAvailableSeats(998);

            pendingOrder = Order.builder()
                    .id(1L)
                    .user(userA)
                    .match(match)
                    .totalAmount(new BigDecimal("200.00"))
                    .status(OrderStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .items(new java.util.ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            pendingOrder.addItem(OrderItem.builder().id(101L).seat(seat1).priceAtBooking(seat1.getPrice()).build());
            pendingOrder.addItem(OrderItem.builder().id(102L).seat(seat2).priceAtBooking(seat2.getPrice()).build());
        }

        @Test
        @DisplayName("owner can cancel order: order -> CANCELLED, seats -> AVAILABLE, availableSeats restored via atomic SQL")
        void cancelOrder_success() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            OrderResponse response = orderService.cancelOrder(1L, userA);

            assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
            assertThat(pendingOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            assertThat(seat1.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            assertThat(seat2.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            // Atomic SQL increment — in-memory match object is NOT updated by service.
            // Verify the correct atomic call was made instead.
            verify(matchRepository).incrementAvailableSeats(match.getId(), 2);
            verify(matchRepository, never()).save(any());
            verify(seatRepository, times(2)).save(any(Seat.class));
            verify(orderRepository).save(pendingOrder);
        }

        @Test
        @DisplayName("ADMIN can cancel user's order")
        void cancelOrder_adminCanCancel() {
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            OrderResponse response = orderService.cancelOrder(1L, admin);

            assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
            // Atomic SQL increment called for admin cancel too
            verify(matchRepository).incrementAvailableSeats(match.getId(), 2);
        }

        @Test
        @DisplayName("non-owner cannot cancel order (throws AccessDeniedException)")
        void cancelOrder_nonOwner_throwsAccessDenied() {
            User userB = User.builder().id(2L).email("userb@test.com").role(Role.USER).build();
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));

            assertThatThrownBy(() -> orderService.cancelOrder(1L, userB))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("cancelling already PAID order throws BusinessException")
        void cancelOrder_alreadyPaid_throws() {
            pendingOrder.setStatus(OrderStatus.PAID);
            when(orderRepository.findByIdWithItems(1L)).thenReturn(Optional.of(pendingOrder));

            assertThatThrownBy(() -> orderService.cancelOrder(1L, userA))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot cancel order");
        }
    }

    // ─── releaseExpiredOrders ────────────────────────────────────────────────────

    @Nested
    @DisplayName("releaseExpiredOrders()")
    class ReleaseExpiredOrders {

        @Test
        @DisplayName("releases all expired PENDING orders, restores seats and calls atomic incrementAvailableSeats")
        void releaseExpiredOrders_success() {
            seat1.setStatus(SeatStatus.RESERVED);
            seat2.setStatus(SeatStatus.RESERVED);
            match.setAvailableSeats(998);

            Order expiredOrder = Order.builder()
                    .id(1L)
                    .user(userA)
                    .match(match)
                    .totalAmount(new BigDecimal("200.00"))
                    .status(OrderStatus.PENDING)
                    .expiresAt(LocalDateTime.now().minusMinutes(5))
                    .items(new java.util.ArrayList<>())
                    .build();

            expiredOrder.addItem(OrderItem.builder().seat(seat1).build());
            expiredOrder.addItem(OrderItem.builder().seat(seat2).build());

            when(orderRepository.findExpiredOrders(eq(OrderStatus.PENDING), any(LocalDateTime.class)))
                    .thenReturn(List.of(expiredOrder));

            int released = orderService.releaseExpiredOrders();

            assertThat(released).isEqualTo(1);
            assertThat(expiredOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            assertThat(seat1.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            assertThat(seat2.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
            // Atomic SQL increment — verify call, not in-memory match object
            verify(matchRepository).incrementAvailableSeats(match.getId(), 2);
            verify(matchRepository, never()).save(any());
            verify(seatRepository, times(2)).save(any(Seat.class));
            verify(orderRepository).save(expiredOrder);
        }

        @Test
        @DisplayName("idempotent: returns 0 when no expired orders exist")
        void releaseExpiredOrders_noExpiredOrders() {
            when(orderRepository.findExpiredOrders(eq(OrderStatus.PENDING), any(LocalDateTime.class)))
                    .thenReturn(List.of());

            int released = orderService.releaseExpiredOrders();

            assertThat(released).isEqualTo(0);
            verify(orderRepository, never()).save(any());
            verify(seatRepository, never()).save(any());
        }
    }
}
