// CRA-safe API client with hard production fallback (never localhost in prod)
import axios from 'axios';

const PROD_API = 'https://contentsubscriptionbackend.onrender.com';
const isProd = process.env.NODE_ENV === 'production';

// In prod, ALWAYS use env or PROD_API; in dev, use localhost by default
export const API_BASE =
  process.env.REACT_APP_API_BASE || (isProd ? PROD_API : 'http://localhost:5000');

console.log('[API] baseURL =', API_BASE);

export const api = axios.create({ baseURL: API_BASE });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// DEBUG: log where requests are going so you can see if anything is off
api.interceptors.request.use((cfg) => {
  // Will print: baseURL + url actually used by axios
  console.log('[API req]', cfg.baseURL, cfg.url);
  return cfg;
});

// Convenience functions
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
