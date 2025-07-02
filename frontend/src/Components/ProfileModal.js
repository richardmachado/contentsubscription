export default function ProfileModal({
  profile,
  setProfile,
  updateProfile,
  logout,
  onClose,
}) {
  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <h3>Edit Profile</h3>
        {!profile ? (
          <p>Loading...</p>
        ) : (
          <>
            <input
              placeholder="Full Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <input
              placeholder="Phone Number"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
            <button onClick={updateProfile}>Save</button>
            <button onClick={logout}>Logout</button>
          </>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
