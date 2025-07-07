import { useState} from "react";

// --- Utils ---
function formatPhone(value) {
  const digits = value.replace(/\D/g, "").substring(0, 10);
  const areaCode = digits.substring(0, 3);
  const middle = digits.substring(3, 6);
  const last = digits.substring(6, 10);

  if (digits.length > 6) return `(${areaCode}) ${middle}-${last}`;
  if (digits.length > 3) return `(${areaCode}) ${middle}`;
  if (digits.length > 0) return `(${areaCode}`;
  return "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^\d{10}$/.test(digits);
}

export default function ProfileModal({ profile, setProfile, updateProfile, logout, onClose }) {
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const emailValid = isValidEmail(profile.email || "");
  const phoneDigits = profile.phone.replace(/\D/g, "");
  const phoneValid = isValidPhone(phoneDigits);

  // --- Update profile as user types ---
  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <h3>Edit Profile</h3>

        {!profile ? (
          <p>Loading...</p>
        ) : (
          <>
            <input
              placeholder="Email"
              type="email"
              value={profile.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
            {!emailValid && (
              <p className="error-text">Please enter a valid email address.</p>
            )}

            <input
              placeholder="Full Name"
              value={profile.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
            />

            <input
              placeholder="Phone Number"
              value={profile.phone || ""}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                handleChange("phone", formatted);
              }}
              required
            />
            {!phoneValid && (
              <p className="error-text">Please enter a valid 10-digit phone number.</p>
            )}

            <button
              onClick={async () => {
                if (!emailValid || !phoneValid) {
                  alert("Fix errors before saving.");
                  return;
                }

                const cleanProfile = {
                  ...profile,
                  phone: phoneDigits, // send stripped version
                };

                try {
                  await updateProfile(cleanProfile);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                } catch (err) {
                  console.error("Failed to save profile:", err);
                }
              }}
              disabled={!emailValid || !phoneValid}
            >
              Save {saveSuccess && <span className="checkmark">✅</span>}
            </button>

            <button onClick={logout}>Logout</button>
          </>
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
