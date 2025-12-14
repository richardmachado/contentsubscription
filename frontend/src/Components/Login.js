// src/Components/Login.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import './Spinner.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

// Password rules and validator
const PASSWORD_RULES =
  'Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.';

function isStrongPassword(pw) {
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return re.test(pw);
}

function Login({ setToken: setTokenProp }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'

  if (mode === 'forgot') {
    return (
      <div className="login-container">
        <ForgotCard onBack={() => setMode('login')} />
      </div>
    );
  }

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
            <p className="forgot-link">
              <button
                type="button"
                className="link-button"
                onClick={() => setMode('forgot')}
              >
                Forgot your password?
              </button>
            </p>

            <p className="auth-toggle-text">Don’t have an account?</p>
            <button
              onClick={() => setMode('signup')}
              className="toggle-action-button"
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            <p className="auth-toggle-text">Already registered?</p>
            <button
              onClick={() => setMode('login')}
              className="toggle-action-button"
            >
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
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login: loginCtx, token, bootstrapped } = useAuth();

  const applyToken = setTokenProp || loginCtx;

  useEffect(() => {
    if (bootstrapped && token) {
      navigate('/' + (location.search || ''), { replace: true });
    }
  }, [bootstrapped, token, location.search, navigate]);

  const submit = async () => {
    if (loading) return;

    // Enforce strong passwords on signup (and optionally on login if you want)
    if (mode === 'signup' && !isStrongPassword(password)) {
      setMsg(PASSWORD_RULES);
      return;
    }

    setLoading(true);

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

      // signup flow
      if (data.success) {
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
    } finally {
      setLoading(false);
    }
  };

  const handleLoginResponse = (data) => {
    if (!data?.token) {
      setMsg(data?.error || 'Login failed');
      return;
    }

    try {
      localStorage.setItem('token', data.token);
    } catch {}

    applyToken(data.token);

    const fromPath = location.state?.from?.pathname || '/';
    const fromSearch = location.state?.from?.search || '';
    setTimeout(() => navigate(fromPath + fromSearch, { replace: true }), 0);
  };

  return (
    <div className="login-card">
      <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <input
        placeholder="Username or Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === 'signup' && (
        <p style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
          {PASSWORD_RULES}
        </p>
      )}
      <button onClick={submit} className="login-button" disabled={loading}>
        {loading && <span className="spinner" aria-hidden="true" />}
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </button>
      {loading && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          Waking the server… this can take a few seconds.
        </p>
      )}
      <p style={{ color: 'crimson' }}>{msg}</p>
    </div>
  );
}

function ForgotCard({ onBack }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const sendResetEmail = async () => {
    setSending(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not send reset email.');
      setMsg(
        data.message ||
          'If that email exists, a reset link has been sent.\nCheck spam folder if not in inbox'
      );
    } catch (err) {
      setMsg(err.message || 'Could not send reset email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="login-card">
      <h2>Reset Password</h2>
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={sendResetEmail}
        className="login-button"
        disabled={!email || sending}
      >
        {sending && <span className="spinner" aria-hidden="true" />}
        {sending ? 'Sending…' : 'Send Reset Email'}
      </button>
      <p
        style={{
          color: 'crimson',
          minHeight: 24,
          whiteSpace: 'pre-line',
        }}
      >
        {msg}
      </p>
      <button type="button" className="link-button" onClick={onBack}>
        ← Back to login
      </button>
    </div>
  );
}

export default Login;
