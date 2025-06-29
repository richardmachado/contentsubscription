import { useEffect, useState } from "react";
import "../Dashboard.css";

export default function Dashboard({ token, setToken }) {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("purchased");
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    // Fetch content
    const fetchItems = async () => {
      const res = await fetch("http://localhost:5000/api/content", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setItems(data);
    };

    // Fetch profile once on load
    const fetchProfile = async () => {
      const res = await fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setProfile({ name: data.name || "", phone: data.phone || "" });
    };

    fetchItems();
    fetchProfile();
  }, [token]);

  const handlePurchase = async (itemId) => {
    const res = await fetch("http://localhost:5000/api/buy/" + itemId, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Error: " + (data.error || "Could not create checkout session"));
    }
  };

  const updateProfile = async () => {
    const res = await fetch("http://localhost:5000/api/profile", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (data.success) {
      setConfirmation(true);
      setTimeout(() => setConfirmation(false), 5000);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  const purchased = items.filter((i) => i.purchased);
  const unpurchased = items.filter((i) => !i.purchased);

  return (
    <div className="container">
      <div className="header">
        <h2>Premium Content</h2>
        <button
          className="profile-button"
          onClick={() => {
            setShowModal(true);
          }}
        >
          ⚙️
        </button>{" "}
      </div>

      <div className="tab-buttons">
        <button
          className={tab === "purchased" ? "active-tab" : ""}
          onClick={() => setTab("purchased")}
        >
          Purchased
        </button>
        <button
          className={tab === "explore" ? "active-tab" : ""}
          onClick={() => setTab("explore")}
        >
          Explore More
        </button>
      </div>

      {tab === "purchased" && (
        <div className="content-list">
          {purchased.length === 0 ? (
            <p>You haven’t purchased any content yet.</p>
          ) : (
            purchased.map((item) => (
              <div key={item.id} className="content-box">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button
                  className="view-button"
                  onClick={() => alert("Enjoy your content!")}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "explore" && (
        <div className="tab-content">
          {unpurchased.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#888" }}>
              🎉 You’ve purchased all current content. Stay tuned for new
              content coming soon!
            </p>
          ) : (
            unpurchased.map((item) => (
              <div key={item.id} className="content-box alt">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button
                  className="buy-button"
                  onClick={() => handlePurchase(item.id)}
                >
                  Buy for ${item.price / 100}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
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
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
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
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="confirmation-modal">
          ✅ Profile updated successfully!
        </div>
      )}
    </div>
  );
}
