import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './Pages/Dashboard';
import AdminDashboard from './Pages/AdminDashboard';
import Subscribe from './Components/Subscribe';
import Login from './Components/Login';
import NodeGuide from './RealContent/NodeGuide';
import ProtectedRoute from './Components/ProtectedRoute';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import JSDataTypesGuide from './RealContent/JSDataTypes';
import LandingPage from './Pages/LandingPage';

function Navigation() {
  const { user, logout } = useAuth();
  const navClass = user?.is_admin ? 'navbar admin-navbar' : 'navbar';

  return (
    <nav className={navClass}>
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
              <Subscribe token={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/dashboard" />}
        />
        <Route path="/learn-node" element={<NodeGuide />} />
        <Route path="/data-types" element={<JSDataTypesGuide />} />
        <Route path="/home" element={<LandingPage />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
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
