import axiosInstance from './axiosInstance';

/**
 * Match API — calls real Spring Boot backend.
 *
 * Endpoints:
 *   GET    /api/matches          → Page<MatchResponse>
 *   GET    /api/matches/{id}     → MatchResponse
 *   POST   /api/matches          → MatchResponse (ADMIN)
 *   PUT    /api/matches/{id}     → MatchResponse (ADMIN)
 *   DELETE /api/matches/{id}     → 204 (ADMIN)
 */

export async function getMatches({ status, page = 0, size = 9 } = {}) {
  const params = { page, size, sort: 'matchDate,asc' };
  if (status) params.status = status;
  const { data } = await axiosInstance.get('/matches', { params });
  return data; // Spring Page: { content, totalPages, totalElements, number, size, ... }
}

export async function getMatchById(id) {
  const { data } = await axiosInstance.get(`/matches/${id}`);
  return data;
}

export async function createMatch(payload) {
  const { data } = await axiosInstance.post('/matches', payload);
  return data;
}

export async function updateMatch(id, payload) {
  const { data } = await axiosInstance.put(`/matches/${id}`, payload);
  return data;
}

export async function deleteMatch(id) {
  await axiosInstance.delete(`/matches/${id}`);
  return { success: true };
}
