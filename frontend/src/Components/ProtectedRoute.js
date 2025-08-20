// src/Components/ProtectedRoute.js
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { token, bootstrapped } = useAuth();
  const location = useLocation();

  if (!bootstrapped) return null;

  if (!token) {
    const sp = new URLSearchParams(location.search);
    const status = sp.get('status');
    const sid = sp.get('session_id');
    if (status && sid) {
      sessionStorage.setItem('pendingStatus', status);
      sessionStorage.setItem('pendingSessionId', sid);
    }
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return children;
}
