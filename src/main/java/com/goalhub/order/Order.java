package com.goalhub.order;

import com.goalhub.match.Match;
import com.goalhub.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Order entity – represents a ticket booking by a user for a specific match.
 *
 * <p>Design:
 * <ul>
 *   <li>{@code user} FK – the user who placed the order.
 *   <li>{@code match} FK – the match being booked (kept per ERD requirement).
 *   <li>{@code totalAmount} – sum of all OrderItem.priceAtBooking values.
 *   <li>{@code items} – cascade persisted with the order.
 * </ul>
 */
@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 0)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (expiresAt == null) {
            expiresAt = createdAt.plusMinutes(10);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Helper to add items and maintain bidirectional relationship. */
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
}
