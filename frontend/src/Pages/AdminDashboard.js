import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAdminUsers } from "../utils/api";

import "../AdminDashboard.css";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

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

  return (
    <div className="container">
      <h2>User Purchase Overview</h2>
      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="user-card-container">
          {users.map((user) => {
            const hasPurchases = user.purchased?.filter(Boolean).length > 0;

            return (
              <div
                key={user.id}
                className={`user-card ${!hasPurchases ? "no-purchases" : ""}`}
              >
                <h3>{user.username}</h3>
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
