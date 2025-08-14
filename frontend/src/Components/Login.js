import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './Login.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function Login({ setToken }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  return (
    <div className="login-container">
      <div className="flip-container">
        <div className={`flipper ${mode === 'signup' ? 'flipped' : ''}`}>
          <div className="front">
            <FormContent mode="login" setToken={setToken} />
          </div>
          <div className="back">
            <FormContent mode="signup" setToken={setToken} />
          </div>
        </div>
      </div>

      {/* 🔥 THIS is the visible mode toggle button */}
      <div className="auth-toggle-wrapper">
        {mode === 'login' ? (
          <>
            <p className="auth-toggle-text">Don’t have an account?</p>
            <button onClick={() => setMode('signup')} className="toggle-action-button">
              Create Account
            </button>
          </>
        ) : (
          <>
            <p className="auth-toggle-text">Already registered?</p>
            <button onClick={() => setMode('login')} className="toggle-action-button">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FormContent({ mode, setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const submit = async () => {
    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (mode === 'login') {
        handleLoginResponse(data);
      } else {
        if (data.success) {
          const loginRes = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          const loginData = await loginRes.json();
          handleLoginResponse(loginData);
        } else {
          setMsg(data.error || 'Signup failed');
        }
      }
    } catch (err) {
      setMsg('An error occurred. Please try again.');
      console.error(err);
    }
  };

  const handleLoginResponse = (data) => {
    if (data.token) {
      setToken(data.token);
      const decoded = jwtDecode(data.token);
      navigate(decoded.is_admin ? '/admin-dashboard' : '/dashboard');
    } else {
      setMsg(data.error || 'Login failed');
    }
  };

  return (
    <div className="login-card">
      <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={submit} className="login-button">
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </button>
      <p style={{ color: 'crimson' }}>{msg}</p>
    </div>
  );
}

export default Login;
