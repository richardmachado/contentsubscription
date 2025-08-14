// CRA style env var: REACT_APP_API_BASE
const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token'); // or your auth context
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}
