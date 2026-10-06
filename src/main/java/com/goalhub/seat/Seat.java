package com.goalhub.seat;

import com.goalhub.match.Match;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Seat entity – represents a single physical seat for a specific {@link Match}.
 *
 * <p>Design notes:
 * <ul>
 *   <li>{@code seatCode} is unique within a match (e.g., "A1", "VIP-03").
 *   <li>{@code price} is the seat-level price (may differ from match.ticketPrice
 *       for VIP upgrades etc.).
 *   <li>{@code version} column is included in the schema for future optimistic-locking
 *       support but is NOT annotated with {@code @Version} at this stage.
 * </ul>
 */
@Entity
@Table(
    name = "seats",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_seat_match_code",
        columnNames = {"match_id", "seat_code"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to the owning match – loaded lazily to avoid N+1 on list queries. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    /** Human-readable code, unique per match (e.g. "A1", "VIP-01"). */
    @Column(name = "seat_code", nullable = false, length = 20)
    private String seatCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_class", nullable = false, length = 20)
    private SeatClass seatClass;

    /** Seat-level price (may be different from match base price for VIP tiers). */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SeatStatus status = SeatStatus.AVAILABLE;

    /**
     * Reserved for future optimistic-locking.
     * Kept as a plain {@code BIGINT} column — {@code @Version} will be added
     * when the Order module introduces concurrent booking.
     */
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
