// src/context/AuthContext.js
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { setAuthToken } from '../utils/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { id, username, is_admin }
  const [bootstrapped, setBootstrapped] = useState(false);

  // 1) Restore token on hard reload (e.g., Stripe redirect)
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) {
      try {
        const payload = jwtDecode(saved);
        // Drop expired tokens
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
        } else {
          setToken(saved);
          setUser({
            id: payload.id ?? payload.sub,
            username: payload.username,
            is_admin: !!payload.is_admin,
          });
        }
      } catch {
        localStorage.removeItem('token');
      }
    }
    setBootstrapped(true);
  }, []);

  // 2) Keep axios header + localStorage + decoded user in sync
  useEffect(() => {
    setAuthToken(token || undefined); // sets axios default Authorization
    if (token) {
      localStorage.setItem('token', token);
      try {
        const payload = jwtDecode(token);
        setUser({
          id: payload.id ?? payload.sub,
          username: payload.username,
          is_admin: !!payload.is_admin,
        });
      } catch {
        setUser(null);
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // 3) Cross-tab login/logout sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') setToken(e.newValue || null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  const value = useMemo(
    () => ({ token, user, login, logout, bootstrapped }),
    [token, user, bootstrapped]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
