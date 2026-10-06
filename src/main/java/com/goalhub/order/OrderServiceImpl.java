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
        List<Long> seatIds = request.seatIds();
        Set<Long> uniqueIds = new HashSet<>(seatIds);
        if (uniqueIds.size() != seatIds.size()) {
            throw new BusinessException("Duplicate seat IDs in request");
        }

        // 3. Load all requested seats — reject if any not found
        List<Seat> seats = seatRepository.findAllById(seatIds);
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

        // 6. Build Order + OrderItems, snapshot prices
        BigDecimal total = seats.stream()
                .map(Seat::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
                .user(currentUser)
                .match(match)
                .totalAmount(total)
                .status(OrderStatus.PENDING)
                .items(new ArrayList<>())
                .build();

        for (Seat seat : seats) {
            OrderItem item = OrderItem.builder()
                    .seat(seat)
                    .priceAtBooking(seat.getPrice())   // snapshot
                    .build();
            order.addItem(item);

            // 7. Reserve the seat
            seat.setStatus(SeatStatus.RESERVED);
            seatRepository.save(seat);
        }

        // 8. Decrement match available seats
        match.setAvailableSeats(match.getAvailableSeats() - seats.size());
        matchRepository.save(match);

        Order saved = orderRepository.save(order);
        log.info("Order id={} created for userId={}", saved.getId(), currentUser.getId());

        // Reload with items for response
        Order withItems = orderRepository.findByIdWithItems(saved.getId()).orElse(saved);
        return OrderResponse.from(withItems);
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
}
