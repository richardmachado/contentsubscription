import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  // useNavigate,
  Link,
} from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import Dashboard from "./Pages/Dashboard";
import AdminDashboard from "./Pages/AdminDashboard";

import Subscribe from "./Components/Subscribe";
import Login from "./Components/Login";
import ProtectedRoute from "./Components/ProtectedRoute";

import "./App.css";






function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(token ? jwtDecode(token) : null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (e) {
        setUser(null);
        setToken("");
        localStorage.removeItem("token");
      }
    }
  }, [token]);

  return (
    <Router>
      <nav className="navbar">
        <Link to="/dashboard">Dashboard</Link>
        {user?.is_admin && <Link to="/admin-dashboard">Admin</Link>}
        {token && (
          <Link
            to="/"
            onClick={() => {
              setToken("");
              setUser(null);
              localStorage.removeItem("token");
            }}
          >
            Logout
          </Link>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={<Login setToken={setToken} setUser={setUser} />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute token={token}>
              <Dashboard token={token} setToken={setToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute token={token}>
              <Subscribe token={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            user?.is_admin ? (
              <AdminDashboard token={token} />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
