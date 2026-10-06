package com.goalhub.order;

import com.goalhub.order.dto.OrderRequest;
import com.goalhub.order.dto.OrderResponse;
import com.goalhub.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service contract for Order operations.
 */
public interface OrderService {

    /**
     * Create a new order for the authenticated user.
     *
     * <p>Business rules enforced:
     * <ul>
     *   <li>Match must exist.
     *   <li>All seat IDs must exist.
     *   <li>All seats must belong to the requested match.
     *   <li>All seats must be AVAILABLE.
     *   <li>No duplicate seat IDs in request.
     *   <li>On success: seats → RESERVED, Order + OrderItems persisted,
     *       match.availableSeats decremented.
     * </ul>
     *
     * @param request     the order details
     * @param currentUser authenticated user placing the order
     * @return created order with items
     */
    OrderResponse createOrder(OrderRequest request, User currentUser);

    /**
     * Get paginated orders belonging to the authenticated user.
     *
     * @param currentUser authenticated user
     * @param pageable    pagination params
     * @return page of order summaries (no items)
     */
    Page<OrderResponse> getMyOrders(User currentUser, Pageable pageable);

    /**
     * Get full order detail including items.
     * Only the order owner or an ADMIN may view.
     *
     * @param orderId     order to fetch
     * @param currentUser authenticated user making the request
     * @return order detail with items
     * @throws com.goalhub.exception.ResourceNotFoundException if order not found
     * @throws org.springframework.security.access.AccessDeniedException if not owner or ADMIN
     */
    OrderResponse getOrderById(Long orderId, User currentUser);
}
