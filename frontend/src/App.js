// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './Pages/Dashboard';
import AdminDashboard from './Pages/AdminDashboard';
import Subscribe from './Components/Subscribe';
import Login from './Components/Login';
import LessonPage from './Pages/LessonPage';
import NodeGuide from './RealContent/NodeGuide';
import ProtectedRoute from './Components/ProtectedRoute';
import LoggedOutRoute from './Components/LoggedOutRoute';
import AdminContent from './Pages/AdminContent';

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
      <Link to="/">Dashboard</Link>
      {user?.is_admin && <Link to="/admin-dashboard">Admin</Link>}
      {user?.is_admin && <Link to="/admin/content">Content</Link>}
      {user ? (
        <Link to="/login" onClick={logout}>
          Logout
        </Link>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}

function AppRoutes() {
  const { user, login } = useAuth();

  return (
    <>
      <Navigation />
      <Routes>
        {/* Public login page (but redirect to "/" if already logged in) */}
        <Route
          path="/login"
          element={
            <LoggedOutRoute redirectTo="/">
              <Login setToken={login} />
            </LoggedOutRoute>
          }
        />

        {/* Option A: Dashboard is the home page so Stripe can return to "/" */}
        <Route
          path="/"
          element={
            <ProtectedRoute redirectTo="/login">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Back-compat: if anything points to /dashboard, send to / */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* Protected pages */}
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute redirectTo="/login">
              <Subscribe />
              <LessonPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute redirectTo="/login">
              {user?.is_admin ? <AdminDashboard /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />
        <Route path="/admin/content" element={<AdminContent />} />

        {/* Public/free pages */}
        <Route path="/learn-node" element={<NodeGuide />} />
        <Route path="/data-types" element={<JSDataTypesGuide />} />
        <Route path="/home" element={<LandingPage />} />

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
