// src/utils/api.js
// CRA-safe API client with robust env & sane fallbacks
import axios from 'axios';

const HARD_CODED_PROD = 'https://contentsubscriptionbackend.onrender.com'; // your backend origin (no /api)
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Allow either CRA or Vite style envs (future-proof)
const ENV_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  null;

// If an env override exists, use it. Otherwise:
//  - localhost -> local server
//  - non-localhost -> hard-coded prod backend
const API_ORIGIN = (ENV_BASE || (isLocalhost ? 'http://localhost:5000' : HARD_CODED_PROD)).replace(
  /\/+$/,
  ''
);

// One Axios instance for the whole app.
// NOTE: Your routes already include `/api/...`, so baseURL is just the origin.
export const api = axios.create({
  baseURL: API_ORIGIN,
  // If you ever switch to cookie-based auth, flip this to true and ensure CORS credentials on server:
  withCredentials: false,
  timeout: 20000,
});

// Set/unset Bearer token
export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// Debug where requests go
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('[API] baseURL =', api.defaults.baseURL);
}
api.interceptors.request.use((cfg) => {
  // eslint-disable-next-line no-console
  console.log('[API req]', (cfg.baseURL || '') + (cfg.url || ''));
  return cfg;
});

/* ================= Convenience functions ================= */

export async function fetchContent() {
  const { data } = await api.get('/api/content');
  return data;
}
export const fetchContentBySlug = async (slugOrId) => {
  const { data } = await api.get(`/api/content/${slugOrId}`);
  return data;
};

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

export async function login(username, password) {
  const { data } = await api.post('/api/login', { username, password });
  return data;
}

export async function register(username, password) {
  const { data } = await api.post('/api/register', { username, password });
  return data;
}

export async function createCheckout(id, quantity = 1) {
  const { data } = await api.post(`/api/buy/${id}`, { quantity });
  return data;
}

export async function markViewed(id) {
  const { data } = await api.post(`/api/mark-viewed/${id}`);
  return data;
}

// NEW: confirm payment helper for the success redirect flow
export const confirmPayment = (sessionId) =>
  api.get(`/api/confirm-payment?session_id=${encodeURIComponent(sessionId)}`);
