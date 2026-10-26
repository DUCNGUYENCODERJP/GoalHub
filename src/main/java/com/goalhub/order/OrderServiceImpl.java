package com.goalhub.order;

import com.goalhub.exception.BusinessException;
import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.order.dto.OrderRequest;
import com.goalhub.order.dto.OrderResponse;
import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatRepository;
import com.goalhub.seat.SeatStatus;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Implementation of {@link OrderService}.
 *
 * <p>All business rule validation happens in {@link #createOrder} before any DB writes:
 * match exists → no duplicate seat IDs → all seats exist → all seats belong to match
 * → all seats AVAILABLE. Only then do we write Order + items + update seat statuses.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private final OrderRepository    orderRepository;
    private final MatchRepository    matchRepository;
    private final SeatRepository     seatRepository;

    @org.springframework.beans.factory.annotation.Value("${app.order.hold-duration-minutes:10}")
    private int holdDurationMinutes = 10;

    @org.springframework.beans.factory.annotation.Value("${app.concurrency-strategy:atomic}")
    private String concurrencyStrategy = "atomic";

    public void setConcurrencyStrategy(String concurrencyStrategy) {
        this.concurrencyStrategy = concurrencyStrategy;
    }

    public String getConcurrencyStrategy() {
        return this.concurrencyStrategy;
    }

    // ─── Create Order ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request, User currentUser) {
        log.debug("Creating order for userId={}, matchId={}, seats={}",
                currentUser.getId(), request.matchId(), request.seatIds());

        // 1. Match must exist
        Match match = matchRepository.findById(request.matchId())
                .orElseThrow(() -> new ResourceNotFoundException("Match", "id", request.matchId()));

        // 2. No duplicate seat IDs in the request
        List<Long> rawSeatIds = request.seatIds();
        Set<Long> uniqueIds = new HashSet<>(rawSeatIds);
        if (uniqueIds.size() != rawSeatIds.size()) {
            throw new BusinessException("Duplicate seat IDs in request");
        }

        // 2b. Sort seat IDs to ensure deterministic lock acquisition order (prevents deadlocks)
        List<Long> seatIds = rawSeatIds.stream().sorted().toList();

        // 3. Load all requested seats — reject if any not found
        //    Sort by ID to match seatIds order (deterministic lock order)
        List<Seat> seats = seatRepository.findAllById(seatIds).stream()
                .sorted(java.util.Comparator.comparing(Seat::getId))
                .toList();
        if (seats.size() != seatIds.size()) {
            Set<Long> foundIds = new HashSet<>();
            seats.forEach(s -> foundIds.add(s.getId()));
            List<Long> missing = seatIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new BusinessException("Seat(s) not found: " + missing);
        }

        // 4. All seats must belong to the requested match
        List<Long> wrongMatch = seats.stream()
                .filter(s -> !s.getMatch().getId().equals(request.matchId()))
                .map(Seat::getId)
                .toList();
        if (!wrongMatch.isEmpty()) {
            throw new BusinessException(
                "Seat(s) do not belong to match " + request.matchId() + ": " + wrongMatch);
        }

        // 5. All seats must be AVAILABLE
        List<Long> unavailable = seats.stream()
                .filter(s -> s.getStatus() != SeatStatus.AVAILABLE)
                .map(Seat::getId)
                .toList();
        if (!unavailable.isEmpty()) {
            throw new BusinessException("Seat(s) not available: " + unavailable);
        }

        // 6. Build Order + OrderItems, snapshot prices (VND integers)
        BigDecimal total = seats.stream()
                .map(Seat::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(0, java.math.RoundingMode.HALF_UP);

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(holdDurationMinutes);

        Order order = Order.builder()
                .user(currentUser)
                .match(match)
                .totalAmount(total)
                .status(OrderStatus.PENDING)
                .expiresAt(expiresAt)
                .items(new ArrayList<>())
                .build();

        if ("atomic".equalsIgnoreCase(concurrencyStrategy)) {
            // ── GIẢI PHÁP 2: ATOMIC UPDATE TẦNG SQL ──────────────────────────────
            // Cập nhật trạng thái ghế nguyên tử trực tiếp bằng SQL:
            // UPDATE seats SET status = 'RESERVED' WHERE id IN (:seatIds) AND status = 'AVAILABLE'
            int updatedSeats = seatRepository.updateStatusIfStatusIs(seatIds, SeatStatus.AVAILABLE, SeatStatus.RESERVED);
            if (updatedSeats != seatIds.size()) {
                throw new com.goalhub.exception.SeatConflictException("Ghế đã được người khác đặt. Vui lòng chọn ghế khác.");
            }

            // Trừ availableSeats của Match nguyên tử ở tầng SQL:
            int matchUpdated = matchRepository.decrementAvailableSeats(match.getId(), seats.size());
            if (matchUpdated == 0) {
                throw new com.goalhub.exception.SeatConflictException("Trận đấu đã hết số lượng ghế trống khả dụng.");
            }

            for (Seat seat : seats) {
                OrderItem item = OrderItem.builder()
                        .seat(seat)
                        .priceAtBooking(seat.getPrice().setScale(0, java.math.RoundingMode.HALF_UP))
                        .build();
                order.addItem(item);
            }

            Order saved = orderRepository.save(order);
            log.info("Order id={} created for userId={} using ATOMIC strategy", saved.getId(), currentUser.getId());
            Order withItems = orderRepository.findByIdWithItems(saved.getId()).orElse(saved);
            return OrderResponse.from(withItems);

        } else {
            // ── GIẢI PHÁP 1: OPTIMISTIC LOCKING (@Version) ──────────────────
            try {
                for (Seat seat : seats) {
                    OrderItem item = OrderItem.builder()
                            .seat(seat)
                            .priceAtBooking(seat.getPrice().setScale(0, java.math.RoundingMode.HALF_UP))
                            .build();
                    order.addItem(item);

                    seat.setStatus(SeatStatus.RESERVED);
                    seatRepository.save(seat);
                }

                // Cập nhật nguyên tử match available seats (áp dụng cho cả 2 phương án)
                int matchUpdated = matchRepository.decrementAvailableSeats(match.getId(), seats.size());
                if (matchUpdated == 0) {
                    throw new com.goalhub.exception.SeatConflictException("Trận đấu đã hết số lượng ghế trống khả dụng.");
                }

                Order saved = orderRepository.save(order);
                orderRepository.flush();

                log.info("Order id={} created for userId={} using OPTIMISTIC strategy", saved.getId(), currentUser.getId());
                Order withItems = orderRepository.findByIdWithItems(saved.getId()).orElse(saved);
                return OrderResponse.from(withItems);
            } catch (org.springframework.orm.ObjectOptimisticLockingFailureException | jakarta.persistence.OptimisticLockException e) {
                log.warn("Optimistic locking failure while reserving seat(s) {}: {}", seatIds, e.getMessage());
                throw new com.goalhub.exception.SeatConflictException("Ghế đã được người khác đặt. Vui lòng chọn ghế khác.", e);
            }
        }
    }

    // ─── Get My Orders ────────────────────────────────────────────────────────────

    @Override
    public Page<OrderResponse> getMyOrders(User currentUser, Pageable pageable) {
        return orderRepository
                .findByUserIdOrderByCreatedAtDesc(currentUser.getId(), pageable)
                .map(OrderResponse::summary);
    }

    // ─── Get Order By ID ─────────────────────────────────────────────────────────

    @Override
    public OrderResponse getOrderById(Long orderId, User currentUser) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Only the owner or an ADMIN may view
        boolean isOwner = order.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException(
                "You do not have permission to view this order");
        }

        return OrderResponse.from(order);
    }

    // ─── Pay Order ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrderResponse payOrder(Long orderId, User currentUser) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Ownership / Authorization check
        boolean isOwner = order.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to pay for this order");
        }

        // Must still be PENDING
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessException("Order cannot be paid because it is not in PENDING status: " + order.getStatus());
        }

        // Check if expired
        if (order.getExpiresAt() != null && order.getExpiresAt().isBefore(LocalDateTime.now())) {
            // Auto cancel and release seats
            order.setStatus(OrderStatus.CANCELLED);
            int seatsRestored = 0;
            for (OrderItem item : order.getItems()) {
                Seat seat = item.getSeat();
                if (seat != null && seat.getStatus() == SeatStatus.RESERVED) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                    seatsRestored++;
                }
            }
            Match match = order.getMatch();
            if (match != null && seatsRestored > 0) {
                match.setAvailableSeats(match.getAvailableSeats() + seatsRestored);
                matchRepository.save(match);
            }
            orderRepository.save(order);
            throw new BusinessException("Order has expired at " + order.getExpiresAt());
        }

        // Transition order: PENDING -> PAID, seats: RESERVED -> SOLD
        order.setStatus(OrderStatus.PAID);
        for (OrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            if (seat != null) {
                seat.setStatus(SeatStatus.SOLD);
                seatRepository.save(seat);
            }
        }

        Order saved = orderRepository.save(order);
        log.info("Order id={} successfully paid by userId={}", saved.getId(), currentUser.getId());
        return OrderResponse.from(saved);
    }

    // ─── Cancel Order ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, User currentUser) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Ownership / Authorization check
        boolean isOwner = order.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to cancel this order");
        }

        // Only PENDING orders can be cancelled
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessException("Cannot cancel order in status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        int seatsRestored = 0;
        for (OrderItem item : order.getItems()) {
            Seat seat = item.getSeat();
            if (seat != null && seat.getStatus() == SeatStatus.RESERVED) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(seat);
                seatsRestored++;
            }
        }

        if (order.getMatch() != null && seatsRestored > 0) {
            matchRepository.incrementAvailableSeats(order.getMatch().getId(), seatsRestored);
        }

        Order saved = orderRepository.save(order);
        log.info("Order id={} cancelled by userId={}, restored {} seats", saved.getId(), currentUser.getId(), seatsRestored);
        return OrderResponse.from(saved);
    }

    // ─── Release Expired Orders (Scheduled Helper) ───────────────────────────────

    @Override
    @Transactional
    public int releaseExpiredOrders() {
        LocalDateTime now = LocalDateTime.now();
        List<Order> expiredOrders = orderRepository.findExpiredOrders(OrderStatus.PENDING, now);
        if (expiredOrders.isEmpty()) {
            return 0;
        }

        log.info("Found {} expired PENDING orders to release", expiredOrders.size());
        int releasedCount = 0;
        for (Order order : expiredOrders) {
            // Idempotency check: only process if status is still PENDING
            if (order.getStatus() != OrderStatus.PENDING) {
                continue;
            }

            order.setStatus(OrderStatus.CANCELLED);
            Match match = order.getMatch();
            int seatsRestored = 0;

            for (OrderItem item : order.getItems()) {
                Seat seat = item.getSeat();
                if (seat != null && seat.getStatus() == SeatStatus.RESERVED) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                    seatsRestored++;
                }
            }

            if (match != null && seatsRestored > 0) {
                matchRepository.incrementAvailableSeats(match.getId(), seatsRestored);
            }

            orderRepository.save(order);
            releasedCount++;
            log.info("Expired order id={} auto-cancelled, restored {} seats", order.getId(), seatsRestored);
        }

        return releasedCount;
    }
}
