import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const RouterContext = createContext(null);

export const normalizePath = () => {
  const hash = window.location.hash.replace(/^#\/?/, "/");
  if (hash && hash !== "/") {
    return hash.startsWith("/") ? hash : `/${hash}`;
  }
  const path = window.location.pathname;
  return path && path !== "/" ? path : "/dashboard";
};

export const RouterProvider = ({ children }) => {
  const { isAuthenticated, loadingAuth } = useAuth();
  const [currentPath, setCurrentPath] = useState(normalizePath);

  const navigate = useCallback((to) => {
    const target = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = `#${target}`;
    if (window.history.pushState) {
      window.history.pushState(null, "", `#${target}`);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(normalizePath());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Auth guard effect
  useEffect(() => {
    if (loadingAuth) return;

    if (!isAuthenticated && currentPath !== "/login") {
      navigate("/login");
    } else if (isAuthenticated && currentPath === "/login") {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loadingAuth, currentPath, navigate]);

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useAppNavigation must be used within a RouterProvider");
  }
  return context;
};

export default RouterContext;

