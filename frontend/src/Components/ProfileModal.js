import { useState, useRef, useEffect } from 'react';
import './profileModal.css';

function formatPhone(value) {
  const val = value || '';
  const digits = val.replace(/\D/g, '').slice(0, 10);
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  if (digits.length > 6) return `(${area}) ${mid}-${last}`;
  if (digits.length > 3) return `(${area}) ${mid}`;
  if (digits.length > 0) return `(${area}`;
  return '';
}

function isValidEmail(email) {
  const val = email || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function isValidPhone(phone) {
  const val = phone || '';
  return /^\d{10}$/.test(val.replace(/\D/g, ''));
}

export default function ProfileModal({
  profile,
  setProfile,
  updateProfile,
  logout,
  onClose,
  onSaved, // optional: parent can show a toast for a few seconds
}) {
  const initial = useRef(profile || {});
  const [form, setForm] = useState(profile || { email: '', name: '', phone: '' });

  const [errorMsg, setErrorMsg] = useState('');
  const [shakeField, setShakeField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const resetForm = {
      email: profile.email || '',
      name: profile.name || '',
      phone: profile.phone || '',
    };
    setForm(resetForm);
    initial.current = resetForm;
    setErrorMsg('');
  }, [profile]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

const handleSave = async () => {
  const emailValid = isValidEmail(form.email);
  const phoneValid = isValidPhone(form.phone);
  const nameValid =
    (form.name || '').trim().length > 0 && /^[^\d]+$/.test((form.name || '').trim());

  if (!emailValid || !phoneValid || !nameValid) {
    const fieldToShake = !emailValid ? 'email' : !phoneValid ? 'phone' : 'name';
    setShakeField(fieldToShake);
    setErrorMsg('Invalid info was not saved! Please fix errors and try again.');
    setTimeout(() => setShakeField(null), 500);
    return;
  }

  setIsSaving(true);
  try {
    const emailVal = form.email.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');
    const nameVal = form.name.trim();

    await updateProfile({ email: emailVal, name: nameVal, phone: phoneDigits });

    setProfile({ email: emailVal, name: nameVal, phone: form.phone });

    // ✅ Show success inside modal
    setErrorMsg('');
    setSaveSuccess(true);

    // Keep "Saving..." a bit longer before closing
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaving(false); // ✅ moved inside delay
      if (onClose) onClose(true);
    }, 1000); // 2 seconds visible
  } catch (err) {
    console.error('Save failed', err);
    setErrorMsg('Failed to save profile. Please try again.');
    setIsSaving(false);
  }
};


  if (!profile) {
    return (
      <div className="profile-modal-overlay">
        <div className="profile-modal">
          <p>Loading...</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  // live validation for input styling/messages
  const emailValidLive = isValidEmail(form.email);
  const phoneValidLive = isValidPhone(form.phone);
  const nameValidLive =
    (form.name || '').trim().length > 0 && /^[^\d]+$/.test((form.name || '').trim());

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <h3>Edit Profile</h3>
        {/* right under <h3>Edit Profile</h3> */}
        {saveSuccess && <div className="confirmation-modal">✅ Profile updated successfully!</div>}
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <input
          className={`${!emailValidLive ? 'invalid' : ''} ${shakeField === 'email' ? 'shake' : ''}`}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
        {!emailValidLive && <p className="error-text">Enter a valid email.</p>}

        <input
          className={`${!nameValidLive ? 'invalid' : ''} ${shakeField === 'name' ? 'shake' : ''}`}
          placeholder="Full Name"
          value={form.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        {!nameValidLive && <p className="error-text">Name cannot be empty or contain numbers.</p>}

        <input
          className={`${!phoneValidLive ? 'invalid' : ''} ${shakeField === 'phone' ? 'shake' : ''}`}
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
        />
        {!phoneValidLive && <p className="error-text">Enter a 10-digit phone number.</p>}

        <div className="button-row">
          <button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button type="button" onClick={logout}>
            Logout
          </button>
          <button type="button" onClick={() => onClose(false)}>
            Close - Do not save
          </button>
        </div>
      </div>
    </div>
  );
}
