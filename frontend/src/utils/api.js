// utils/api.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";


// Create a reusable Axios instance
const api = axios.create({
  baseURL: BASE_URL,
});

// Interceptor to attach token to each request
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// Fetch content items
export async function fetchContent() {
  const res = await api.get("/content");
  return res.data;
}

// Fetch user profile
export async function fetchProfile() {
  const res = await api.get("/profile");
  return {
    name: res.data.name || "",
    phone: res.data.phone || "",
  };
}

// Update user profile
export async function updateProfile(profile) {
  const res = await api.post("/profile", profile);
  if (!res.data.success) throw new Error(res.data.error || "Profile update failed");
  return res.data;
}

// Existing fetchContent, fetchProfile, updateProfile...

export async function fetchAdminUsers() {
  const res = await api.get("/admin/users");
  if (!Array.isArray(res.data)) {
    throw new Error("Expected an array of users");
  }
  return res.data;
}