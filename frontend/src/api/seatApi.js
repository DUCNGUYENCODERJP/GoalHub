import axiosInstance from './axiosInstance';

/**
 * Seat API — calls real Spring Boot backend.
 *
 * Endpoints:
 *   GET  /api/matches/{matchId}/seats      → List<SeatResponse>
 *   POST /api/matches/{matchId}/seats/bulk → BulkSeatResponse (ADMIN)
 */

export async function getSeatsByMatch(matchId) {
  const { data } = await axiosInstance.get(`/matches/${matchId}/seats`);
  return data; // List<SeatResponse>
}

export async function bulkCreateSeats(matchId, payload) {
  const { data } = await axiosInstance.post(
    `/matches/${matchId}/seats/bulk`,
    payload
  );
  return data; // { created, seats }
}
