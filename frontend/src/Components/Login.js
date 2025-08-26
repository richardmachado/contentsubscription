// src/Components/Login.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function Login({ setToken: setTokenProp }) {
  const [mode, setMode] = useState('login');
  return (
    <div className="login-container">
      <div className="flip-container">
        <div className={`flipper ${mode === 'signup' ? 'flipped' : ''}`}>
          <div className="front">
            <FormContent mode="login" setTokenProp={setTokenProp} />
          </div>
          <div className="back">
            <FormContent mode="signup" setTokenProp={setTokenProp} />
          </div>
        </div>
      </div>
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

function FormContent({ mode, setTokenProp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login: loginCtx, token, bootstrapped } = useAuth();

  const applyToken = setTokenProp || loginCtx;

  // If we somehow hit /login while already logged in, bounce to home (+ keep any ?status=...)
  useEffect(() => {
    if (bootstrapped && token) {
      navigate('/' + (location.search || ''), { replace: true });
    }
  }, [bootstrapped, token, location.search, navigate]);

  const submit = async () => {
    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const txt = await res.text();
      let data;
      try {
        data = JSON.parse(txt);
      } catch {
        setMsg('Server returned HTML instead of JSON—check API base URL.');
        return;
      }

      if (mode === 'login') {
        return handleLoginResponse(data);
      }

      if (data.success) {
        // auto-login after signup
        const loginRes = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const loginTxt = await loginRes.text();
        let loginData;
        try {
          loginData = JSON.parse(loginTxt);
        } catch {
          setMsg('Server returned HTML instead of JSON during login.');
          return;
        }
        return handleLoginResponse(loginData);
      } else {
        setMsg(data.error || 'Signup failed');
      }
    } catch (err) {
      setMsg('An error occurred. Please try again.');
      console.error(err);
    }
  };

  const handleLoginResponse = (data) => {
    if (!data?.token) {
      setMsg(data?.error || 'Login failed');
      return;
    }

    // 1) Persist immediately (avoid race)
    try {
      localStorage.setItem('token', data.token);
    } catch {}

    // 2) Update context (sets axios header, user, etc.)
    applyToken(data.token);

    // 3) Navigate back to where we came from (preserve Stripe params)
    const fromPath = location.state?.from?.pathname || '/';
    const fromSearch = location.state?.from?.search || '';
    // next tick to allow state to flush
    setTimeout(() => navigate(fromPath + fromSearch, { replace: true }), 0);
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
