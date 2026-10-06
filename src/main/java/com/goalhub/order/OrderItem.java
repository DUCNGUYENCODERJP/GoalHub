package com.goalhub.order;

import com.goalhub.seat.Seat;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * OrderItem entity – links an Order to a specific Seat,
 * capturing the seat price at the moment of booking.
 *
 * <p>{@code priceAtBooking} is a snapshot of Seat.price at order creation time.
 * This ensures the booked price is immutable even if seat pricing changes later.
 */
@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    /** Price snapshot at the time of booking — decoupled from seat's current price. */
    @Column(name = "price_at_booking", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceAtBooking;
}
