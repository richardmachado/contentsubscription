// src/Pages/ResetPassword.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleReset = async () => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setMsg('Password updated! You can now log in.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="login-card">
      <h2>Choose a New Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button onClick={handleReset}>Update Password</button>
      <p style={{ color: 'crimson' }}>{msg}</p>
    </div>
  );
}
