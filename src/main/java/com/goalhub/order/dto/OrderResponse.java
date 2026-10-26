package com.goalhub.order.dto;

import com.goalhub.order.Order;
import com.goalhub.order.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for an Order.
 * {@code items} is included when fetching order detail; may be empty on list endpoints.
 */
public record OrderResponse(
        Long id,
        Long userId,
        Long matchId,
        String homeTeam,
        String awayTeam,
        LocalDateTime matchDate,
        BigDecimal totalAmount,
        OrderStatus status,
        List<OrderItemResponse> items,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /** Backward-compatible constructor without expiresAt */
    public OrderResponse(
            Long id,
            Long userId,
            Long matchId,
            String homeTeam,
            String awayTeam,
            LocalDateTime matchDate,
            BigDecimal totalAmount,
            OrderStatus status,
            List<OrderItemResponse> items,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this(id, userId, matchId, homeTeam, awayTeam, matchDate, totalAmount, status, items, null, createdAt, updatedAt);
    }

    /** Full mapping with items (for detail endpoint). */
    public static OrderResponse from(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems()
                .stream()
                .map(OrderItemResponse::from)
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getUser().getId(),
                order.getMatch().getId(),
                order.getMatch().getHomeTeam(),
                order.getMatch().getAwayTeam(),
                order.getMatch().getMatchDate(),
                order.getTotalAmount(),
                order.getStatus(),
                itemResponses,
                order.getExpiresAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    /** Summary mapping without items (for list endpoint). */
    public static OrderResponse summary(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getUser().getId(),
                order.getMatch().getId(),
                order.getMatch().getHomeTeam(),
                order.getMatch().getAwayTeam(),
                order.getMatch().getMatchDate(),
                order.getTotalAmount(),
                order.getStatus(),
                List.of(),
                order.getExpiresAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
