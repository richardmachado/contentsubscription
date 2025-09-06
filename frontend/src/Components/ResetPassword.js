import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get('token') || '';
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) setMsg('Missing reset token.');
  }, [token]);

  const submit = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reset failed');
      setMsg('Password updated! Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Choose a New Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <button onClick={submit} disabled={!token || !pwd || saving}>
        {saving ? 'Updating…' : 'Update Password'}
      </button>
      <p style={{ color: 'crimson', minHeight: 24 }}>{msg}</p>
    </div>
  );
}
