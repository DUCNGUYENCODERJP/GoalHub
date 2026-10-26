package com.goalhub.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /** Paginated orders for a specific user, newest first. */
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Fetch order by ID with items and their seats eagerly loaded.
     * Avoids N+1 when rendering order detail response.
     */
    @Query("""
            SELECT DISTINCT o FROM Order o
            LEFT JOIN FETCH o.items i
            LEFT JOIN FETCH i.seat s
            WHERE o.id = :id
            """)
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    /**
     * Find pending orders that have exceeded their hold expiration time.
     * Eagerly loads items, seats, and match to safely release seats and restore inventory.
     */
    @Query("""
            SELECT DISTINCT o FROM Order o
            LEFT JOIN FETCH o.items i
            LEFT JOIN FETCH i.seat s
            LEFT JOIN FETCH o.match m
            WHERE o.status = :status AND o.expiresAt < :now
            """)
    java.util.List<Order> findExpiredOrders(
            @Param("status") OrderStatus status,
            @Param("now") java.time.LocalDateTime now);
}
