// src/utils/api.js
import axios from 'axios';

export const PROD_API = 'https://contentsubscriptionbackend.onrender.com';

// For CRA/Webpack builds. Use dev check instead of hostname.
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : PROD_API);

console.log('[API] baseURL =', API_BASE);

export const api = axios.create({ baseURL: API_BASE });

// Call once (e.g., after login or on app boot) to set the Authorization header globally
export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// Convenience wrappers
export async function fetchContent() {
  const { data } = await api.get('/api/content');
  return data;
}
export async function fetchProfile() {
  const { data } = await api.get('/api/profile');
  return data;
}
export async function updateProfile(updates) {
  const { data } = await api.put('/api/profile', updates);
  return data;
}
export async function fetchAdminUsers() {
  const { data } = await api.get('/api/admin/users');
  return data;
}

// Auth helpers
export async function login(username, password) {
  const { data } = await api.post('/api/login', { username, password });
  return data;
}
export async function register(username, password) {
  const { data } = await api.post('/api/register', { username, password });
  return data;
}
