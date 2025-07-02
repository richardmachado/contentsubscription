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
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Purchased Items</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name?.trim() ? user.name : "Not set"}</td>
                <td>{user.phone?.trim() ? user.phone : "Not set"}</td>
                <td>
                  {(user.purchased || []).filter(Boolean).join(", ") || "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
