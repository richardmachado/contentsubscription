// utils/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token once the user logs in (and on app boot if token exists)
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// OPTIONAL: global response error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // e.g. if (err.response?.status === 401) logout();
    return Promise.reject(err);
  }
);

// -------- API calls --------

export async function fetchContent() {
  const res = await api.get('/content');
  // Expect backend to include `viewed` for purchased items.
  // If your backend wraps payload: { items: [...] }, return res.data.items instead.
  return res.data;
}

export async function fetchProfile() {
  const res = await api.get('/profile');
  const { name = '', phone = '', email = '' } = res.data || {};
  return { name, phone, email };
}

export async function updateProfile(profile) {
  // match your server method: POST/PUT/PATCH
  const res = await api.post('/profile', profile);
  if (!res.data?.success) {
    throw new Error(res.data?.error || 'Profile update failed');
  }
  return res.data;
}

export async function fetchAdminUsers() {
  const res = await api.get('/admin/users');
  if (!Array.isArray(res.data)) throw new Error('Expected an array of users');
  return res.data;
}

export async function markViewed(contentId) {
  // use the same axios instance so the Authorization header is included
  const res = await api.post(`/mark-viewed/${contentId}`);
  // backend should 200 with rowCount > 0, otherwise 404
  if (res.status !== 200) throw new Error('Failed to mark viewed');
  return true;
}
