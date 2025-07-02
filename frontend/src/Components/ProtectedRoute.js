import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ token, children }) {
  return token ? children : <Navigate to="/" />;
}
