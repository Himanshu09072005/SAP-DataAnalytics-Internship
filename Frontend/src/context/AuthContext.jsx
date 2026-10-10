import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/auth";
import AuthModal from "../components/Common/AuthModal";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Authentication Dialog State
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    callback: null,
    actionName: "",
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
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
      const fallbackUser = { Username: username, Role: "Admin" };
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  };

  const openLoginModal = (callback = null, actionName = "") => {
    setAuthModalState({
      isOpen: true,
      callback: typeof callback === "function" ? callback : null,
      actionName,
    });
  };

  const closeLoginModal = () => {
    setAuthModalState({
      isOpen: false,
      callback: null,
      actionName: "",
    });
  };

  const requireAuth = (callback, actionName = "modify records") => {
    if (token) {
      if (typeof callback === "function") callback();
    } else {
      openLoginModal(callback, actionName);
    }
  };

  const handleModalSuccess = (receivedToken, userData) => {
    setToken(receivedToken);
    setUser(userData);
    const cb = authModalState.callback;
    closeLoginModal();
    if (typeof cb === "function") {
      try {
        cb();
      } catch (err) {
        console.error("Error executing pending action after login:", err);
      }
    }
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
        requireAuth,
        openLoginModal,
        closeLoginModal,
        refreshProfile: fetchUserProfile,
      }}
    >
      {children}
      <AuthModal
        isOpen={authModalState.isOpen}
        actionName={authModalState.actionName}
        onClose={closeLoginModal}
        onSuccess={handleModalSuccess}
      />
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
