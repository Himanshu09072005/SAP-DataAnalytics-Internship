import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
      // If token is invalid, clear it
      localStorage.removeItem("token");
      setToken("");
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setUser(null);
      setLoadingAuth(false);
    }

    const handleUnauthorized = () => {
      setToken("");
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [token, fetchUserProfile]);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    const receivedToken = data.access_token;
    localStorage.setItem("token", receivedToken);
    setToken(receivedToken);
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    window.location.hash = "#/login";
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loadingAuth,
        login,
        logout,
        refreshProfile: fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

