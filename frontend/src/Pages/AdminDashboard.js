import { useEffect, useState } from "react";
import "../AdminDashboard.css";

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("http://localhost:5000/api/admin/users", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setUsers(data);
    };
    fetchUsers();
  }, [token]);

  return (
    <div className="container">
      <h2>User Purchase Overview</h2>
      {users.length === 0 ? (
        <p>Loading users...</p>
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
