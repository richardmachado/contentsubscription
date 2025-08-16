// src/utils/api.js (CRA-safe: no import.meta)
import axios from 'axios';

const PROD_API = 'https://contentsubscriptionbackend.onrender.com';

// CRA uses REACT_APP_* at build time
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== 'undefined' && window.__API_BASE__) || // optional override if you set it
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : PROD_API);

console.log('[API] baseURL =', API_BASE);

export const api = axios.create({ baseURL: API_BASE });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

/* Convenience wrappers your pages import */
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

export async function createCheckout(contentId, quantity = 1) {
  const { data } = await api.post(`/api/buy/${contentId}`, { quantity });
  return data;
}

export async function markViewed(contentId) {
  const { data } = await api.post(`/api/mark-viewed/${contentId}`);
  return data;
}
