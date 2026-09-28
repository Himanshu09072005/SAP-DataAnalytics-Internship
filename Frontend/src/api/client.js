import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and 401 Unauthorized
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and trigger redirect event if not already on login
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }

    // Extract cleanest error message
    let message = "An unexpected error occurred.";
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === "string") {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail.map((d) => d.msg || d.loc?.join(" ")).join(", ");
      }
    } else if (error.message) {
      message = error.message;
    }

    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export const authHeader = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export default client;

