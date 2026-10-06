import axiosInstance from './axiosInstance';

/**
 * Order API — calls real Spring Boot backend.
 *
 * Endpoints:
 *   GET  /api/orders/my   → Page<OrderResponse>   (summary, no items)
 *   GET  /api/orders/{id} → OrderResponse          (full with items)
 *   POST /api/orders      → OrderResponse           (create booking)
 */

export async function getMyOrders({ page = 0, size = 10 } = {}) {
  const { data } = await axiosInstance.get('/orders/my', {
    params: { page, size, sort: 'createdAt,desc' },
  });
  return data; // Spring Page
}

export async function getOrderById(id) {
  const { data } = await axiosInstance.get(`/orders/${id}`);
  return data;
}

export async function createOrder({ matchId, seatIds }) {
  const { data } = await axiosInstance.post('/orders', { matchId, seatIds });
  return data;
}
