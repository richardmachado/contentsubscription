import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAdminUsers, setAuthToken } from "../utils/api";
import "../AdminDashboard.css";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("non-payers");

  useEffect(() => {
    if (!token) return;

    setAuthToken(token);

    const loadUsers = async () => {
      try {
        const data = await fetchAdminUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [token]);

  const nonPayers = users.filter(
    (user) => !user.purchased || user.purchased.filter(Boolean).length === 0,
  );

  const payers = users.filter(
    (user) => user.purchased && user.purchased.filter(Boolean).length > 0,
  );

  const displayedUsers = activeTab === "non-payers" ? nonPayers : payers;

  return (
    <div className="container">
      <h2>User Purchase Overview</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "non-payers" ? "active non-payers" : ""}`}
          onClick={() => setActiveTab("non-payers")}
        >
          🚫 Non-Payers ({nonPayers.length})
        </button>
        <button
          className={`tab ${activeTab === "payers" ? "active payers" : ""}`}
          onClick={() => setActiveTab("payers")}
        >
          💸 Payers ({payers.length})
        </button>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : displayedUsers.length === 0 ? (
        <p>No users found in this tab.</p>
      ) : (
        <div className="user-card-container">
          {displayedUsers.map((user) => {
            const hasPurchases = user.purchased?.filter(Boolean).length > 0;

            return (
              <div
                key={user.id}
                className={`user-card ${!hasPurchases ? "no-purchases" : ""}`}
              >
                <h3>{user.username}</h3>
                <p>
                  <strong>Email:</strong> {user.email || "Not set"}
                </p>
                <p>
                  <strong>Full Name:</strong> {user.name?.trim() || "Not set"}
                </p>
                <p>
                  <strong>Phone:</strong> {user.phone?.trim() || "Not set"}
                </p>
                <p>
                  <strong>Purchased Items:</strong>
                </p>
                <div className="chip-group">
                  {hasPurchases ? (
                    user.purchased.filter(Boolean).map((item, index) => (
                      <span key={index} className="status-chip">
                        {item}
                      </span>
                    ))
                  ) : (
                    <div className="no-purchases-chip-wrapper">
                      <span className="status-chip none">None</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
