import axiosInstance from './axiosInstance';

/**
 * Auth API — calls real Spring Boot backend.
 *
 * Endpoints:
 *   POST /api/auth/login     → { token, tokenType, email, role }
 *   POST /api/auth/register  → { token, tokenType, email, role }
 *   GET  /api/auth/me        → { id, email, fullName, role }
 */

export async function login({ email, password }) {
  const { data } = await axiosInstance.post('/auth/login', { email, password });
  return data; // { token, tokenType, email, role }
}

export async function register({ email, password, fullName }) {
  const { data } = await axiosInstance.post('/auth/register', {
    email,
    password,
    fullName,
  });
  return data; // { token, tokenType, email, role }
}

export async function getMe() {
  const { data } = await axiosInstance.get('/auth/me');
  return data; // { id, email, fullName, role }
}
