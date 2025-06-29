import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link,
} from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Dashboard from "./Pages/Dashboard";
import AdminDashboard from "./Pages/AdminDashboard";
import "./App.css";

function Login({ setToken, setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    const res = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      const decoded = jwtDecode(data.token);
      console.log("Decoded JWT:", decoded); // for debugging
      setUser(decoded);

      // 👇 Redirect based on admin status
      if (decoded.is_admin) {
        navigate("/admin-dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      setMsg(data.error || "Login failed");
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Login</button>
      <p>{msg}</p>
    </div>
  );
}

function Subscribe({ token }) {
  const goToCheckout = async () => {
    const res = await fetch("http://localhost:5000/api/checkout", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div className="container">
      <h2>This is a premium app — $5 to unlock</h2>
      <button onClick={goToCheckout}>Subscribe via Stripe</button>
    </div>
  );
}

function ProtectedRoute({ token, children }) {
  return token ? children : <Navigate to="/" />;
}



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
