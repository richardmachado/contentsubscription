// src/Components/ProtectedRoute.js
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { token, bootstrapped } = useAuth();
  const location = useLocation();

  // Wait until we restore token from localStorage on hard reloads
  if (!bootstrapped) return null; // or a tiny loader/spinner

  // Not logged in → send to login and remember where we were going
  if (!token) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Authenticated → render protected content
  return children;
}
