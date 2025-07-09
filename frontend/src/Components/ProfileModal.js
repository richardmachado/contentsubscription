import { useState, useRef, useEffect } from "react";
import "./profileModal.css";
function formatPhone(value) {
  const val = value || "";
  const digits = val.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  if (digits.length > 6) return `(${area}) ${mid}-${last}`;
  if (digits.length > 3) return `(${area}) ${mid}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}

function isValidEmail(email) {
  const val = email || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function isValidPhone(phone) {
  const val = phone || "";
  return /^\d{10}$/.test(val.replace(/\D/g, ""));
}

export default function ProfileModal({
  profile,
  setProfile,
  updateProfile,
  logout,
  onClose,
}) {
  const initial = useRef(profile || {});
  const [form, setForm] = useState(
    profile || { email: "", name: "", phone: "" },
  );
  //const [dirty, setDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shakeField, setShakeField] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const resetForm = {
      email: profile.email || "",
      name: profile.name || "",
      phone: profile.phone || "",
    };
    setForm(resetForm);
    initial.current = resetForm;

    setErrorMsg("");
  }, [profile]);

  const handleChange = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
  };

  const handleSave = async () => {
    const emailVal = form.email || "";
    const phoneVal = form.phone || "";
    const digits = phoneVal.replace(/\D/g, "");
    const validEmail = isValidEmail(emailVal);
    const validPhone = isValidPhone(phoneVal);

    if (!validEmail || !validPhone || !nameValid) {
      const fieldToShake = !validEmail
        ? "email"
        : !validPhone
          ? "phone"
          : "name";
      setShakeField(fieldToShake);
      setErrorMsg(
        "Invalid info was not saved! Please fix errors and try again.",
      );
      setTimeout(() => setShakeField(null), 500);
      return;
    }

    try {
      await updateProfile({ email: emailVal, name: form.name, phone: digits });

      setProfile({ email: emailVal, name: form.name, phone: form.phone || "" });

      setSaveSuccess(true);
      setErrorMsg("");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMsg("Failed to save profile. Please try again.");
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

  const emailValid = isValidEmail(form.email);
  const phoneValid = isValidPhone(form.phone);
  const nameValid =
    (form.name || "").trim().length > 0 && /^[^\d]+$/.test(form.name.trim());

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <h3>Edit Profile</h3>

        {saveSuccess && (
          <div className="confirmation-modal">
            ✅ Profile updated successfully!
          </div>
        )}
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <input
          className={`${!emailValid ? "invalid" : ""} ${shakeField === "email" ? "shake" : ""}`}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        {!emailValid && <p className="error-text">Enter a valid email.</p>}

        <input
          className={`${!nameValid ? "invalid" : ""} ${shakeField === "name" ? "shake" : ""}`}
          placeholder="Full Name"
          value={form.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        {!nameValid && (
          <p className="error-text">Name cannot be empty or contain numbers.</p>
        )}

        <input
          className={`${!phoneValid ? "invalid" : ""} ${shakeField === "phone" ? "shake" : ""}`}
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) => handleChange("phone", formatPhone(e.target.value))}
        />
        {!phoneValid && (
          <p className="error-text">Enter a 10-digit phone number.</p>
        )}

        <div className="button-row">
          <button type="button" onClick={handleSave}>
            Save
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
