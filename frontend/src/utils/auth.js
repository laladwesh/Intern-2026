export const API_BASE =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:5000/intern-2026/api"
    : process.env.REACT_APP_API_BASE || "/api";

export const getToken = () => localStorage.getItem("authToken");
export const getRole = () => localStorage.getItem("authRole");

export const saveSession = (token, role) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authRole", role);
};

export const clearSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authRole");
};

export const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});

export const authHeadersFormData = () => ({
  Authorization: `Bearer ${getToken()}`,
});
