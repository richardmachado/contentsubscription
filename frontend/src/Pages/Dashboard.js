import { useEffect, useState } from "react";
import "../Dashboard.css";
import ContentTabs from "../Components/ContentTabs";
import ProfileModal from "../Components/ProfileModal";

import {
  fetchContent,
  fetchProfile,
  updateProfile as saveProfile,
} from "../utils/api";

import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("purchased");
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedItems, fetchedProfile] = await Promise.all([
          fetchContent(),
          fetchProfile(),
        ]);
        setItems(fetchedItems);
        setProfile(fetchedProfile);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const updateProfile = async () => {
    try {
      await saveProfile(profile);
      setConfirmation(true);
      setTimeout(() => setConfirmation(false), 5000);
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  };

  const purchased = items.filter((i) => i.purchased);
  const unpurchased = items.filter((i) => !i.purchased);

  return (
    <div className="container">
      <div className="header">
        <h2>Premium Content</h2>
        <button className="profile-button" onClick={() => setShowModal(true)}>
          ⚙️
        </button>
      </div>

      <ContentTabs
        tab={tab}
        setTab={setTab}
        purchased={purchased}
        unpurchased={unpurchased}
      />

      {showModal && (
        <ProfileModal
          profile={profile}
          setProfile={setProfile}
          updateProfile={updateProfile}
          logout={logout}
          onClose={() => setShowModal(false)}
        />
      )}

      {confirmation && (
        <div className="confirmation-modal">
          ✅ Profile updated successfully!
        </div>
      )}
    </div>
  );
}
