// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard from './Pages/Dashboard';
import AdminDashboard from './Pages/AdminDashboard';
import Subscribe from './Components/Subscribe';
import LessonPage from './Pages/LessonPage';

import Landing from './Pages/Landing'; // <-- Landing page that embeds <Login />
import Login from './Components/Login'; // (kept just in case you want a standalone route later)

import ProtectedRoute from './Components/ProtectedRoute';
import LoggedOutRoute from './Components/LoggedOutRoute';

import AdminContent from './Pages/AdminContent';
import ResetPassword from './Components/ResetPassword';

import JSDataTypesGuide from './RealContent/JSDataTypes';
import NodeGuide from './RealContent/NodeGuide';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';

// ----------------------------------------
// Simple top navigation (optional)
// ----------------------------------------
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

// ----------------------------------------
// Routes
// ----------------------------------------
function AppRoutes() {
  const { user, login } = useAuth();

  return (
    <>
      <Navigation />

      <Routes>
        {/* Public: Landing experience at /login (redirect to "/" if already logged in) */}
        <Route
          path="/login"
          element={
            <LoggedOutRoute redirectTo="/">
              <Landing />{' '}
              {/* <Landing /> should import and render your existing <Login /> inside it */}
            </LoggedOutRoute>
          }
        />

        {/* Protected home: Dashboard at "/" so Stripe can return here */}
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
          path="/content/:slugOrId"
          element={
            <ProtectedRoute redirectTo="/login">
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

        <Route
          path="/admin/content"
          element={
            <ProtectedRoute redirectTo="/login">
              <AdminContent />
            </ProtectedRoute>
          }
        />

        {/* Public/free pages */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/learn-node" element={<NodeGuide />} />
        <Route path="/data-types" element={<JSDataTypesGuide />} />

        {/* Catch-all → home (protected) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </>
  );
}

// ----------------------------------------
// App root
// ----------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
