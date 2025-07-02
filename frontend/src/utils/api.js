// utils/api.js

export async function fetchContent(token) {
  const res = await fetch("http://localhost:5000/api/content", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Failed to fetch content");
  return await res.json();
}

export async function fetchProfile(token) {
  const res = await fetch("http://localhost:5000/api/profile", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return {
    name: data.name || "",
    phone: data.phone || "",
  };
}

export async function updateProfile(token, profile) {
  const res = await fetch("http://localhost:5000/api/profile", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to update profile");
  return data;
}
