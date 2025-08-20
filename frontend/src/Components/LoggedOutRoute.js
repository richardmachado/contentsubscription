import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoggedOutRoute({ children, redirectTo = '/' }) {
  const { token, bootstrapped } = useAuth();
  const location = useLocation();

  // wait until AuthContext restores token from localStorage
  if (!bootstrapped) return null;

  // already logged in → send to dashboard (preserve any ?status=... from Stripe)
  if (token) return <Navigate to={redirectTo + (location.search || '')} replace />;

  // not logged in → show the login page
  return children;
}
