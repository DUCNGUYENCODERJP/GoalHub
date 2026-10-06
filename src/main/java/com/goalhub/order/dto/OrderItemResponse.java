package com.goalhub.order.dto;

import com.goalhub.order.OrderItem;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatStatus;

import java.math.BigDecimal;

/**
 * Response DTO for a single OrderItem.
 * Includes seat snapshot info so the client doesn't need a separate seat lookup.
 */
public record OrderItemResponse(
        Long orderItemId,
        Long seatId,
        String seatCode,
        SeatClass seatClass,
        SeatStatus seatStatus,
        BigDecimal priceAtBooking
) {
    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getSeat().getId(),
                item.getSeat().getSeatCode(),
                item.getSeat().getSeatClass(),
                item.getSeat().getStatus(),
                item.getPriceAtBooking()
        );
    }
}
