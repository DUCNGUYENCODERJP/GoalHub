package com.goalhub.seat;

/**
 * Booking state of a {@link Seat}.
 *
 * <ul>
 *   <li>AVAILABLE – seat is open for purchase
 *   <li>RESERVED  – seat is held (e.g., in cart / pending payment)
 *   <li>SOLD      – payment confirmed, seat permanently taken
 * </ul>
 */
public enum SeatStatus {
    AVAILABLE,
    RESERVED,
    SOLD
}
