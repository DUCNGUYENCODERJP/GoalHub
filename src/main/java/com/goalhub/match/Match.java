package com.goalhub.match;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Match entity – represents a football match for which tickets can be booked.
 *
 * <p>Fields:
 * <ul>
 *   <li>{@code homeTeam} / {@code awayTeam} – team names
 *   <li>{@code matchDate} – scheduled kick-off time (stored in UTC)
 *   <li>{@code venue} – stadium / location
 *   <li>{@code status} – lifecycle state (see {@link MatchStatus})
 *   <li>{@code totalSeats} – physical capacity of the venue for this match
 *   <li>{@code availableSeats} – decremented when orders are placed
 *   <li>{@code ticketPrice} – base price; captured as {@code price_at_booking} in Order
 * </ul>
 */
@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String homeTeam;

    @Column(nullable = false, length = 100)
    private String awayTeam;

    @Column(nullable = false)
    private LocalDateTime matchDate;

    @Column(nullable = false, length = 200)
    private String venue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MatchStatus status = MatchStatus.UPCOMING;

    @Column(nullable = false)
    private Integer totalSeats;

    @Column(nullable = false)
    private Integer availableSeats;

    /**
     * Base ticket price ("giá từ") – displayed on match listings and cards.
     * The actual booked price is determined by individual Seat.price.
     */
    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal ticketPrice;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (availableSeats == null) {
            availableSeats = totalSeats;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
