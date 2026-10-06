package com.goalhub.seat.dto;

import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for a single {@link Seat}.
 * Exposes {@code matchId} instead of the full Match object to keep response slim.
 */
public record SeatResponse(
        Long id,
        Long matchId,
        String seatCode,
        SeatClass seatClass,
        BigDecimal price,
        SeatStatus status,
        Long version,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Static factory — maps from {@link Seat} entity.
     * Accesses {@code seat.getMatch().getId()} which is safe because
     * Hibernate can proxy-resolve the ID without a full LAZY load.
     */
    public static SeatResponse from(Seat seat) {
        return new SeatResponse(
                seat.getId(),
                seat.getMatch().getId(),
                seat.getSeatCode(),
                seat.getSeatClass(),
                seat.getPrice(),
                seat.getStatus(),
                seat.getVersion(),
                seat.getCreatedAt(),
                seat.getUpdatedAt()
        );
    }
}
