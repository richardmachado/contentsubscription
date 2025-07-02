import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Dashboard from "./Pages/Dashboard";
import AdminDashboard from "./Pages/AdminDashboard";
import Subscribe from "./Components/Subscribe";
import Login from "./Components/Login";
import ProtectedRoute from "./Components/ProtectedRoute";

import "./App.css";

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/dashboard">Dashboard</Link>
      {user?.is_admin && <Link to="/admin-dashboard">Admin</Link>}
      {user && (
        <Link to="/" onClick={logout}>
          Logout
        </Link>
      )}
    </nav>
  );
}

function AppRoutes() {
  const { token, user, login } = useAuth();

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Login setToken={login} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute token={token}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute token={token}>
              <Subscribe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            user?.is_admin ? <AdminDashboard /> : <Navigate to="/dashboard" />
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
