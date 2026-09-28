import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return "bi-check-circle-fill";
      case "error":
        return "bi-exclamation-octagon-fill";
      case "warning":
        return "bi-exclamation-triangle-fill";
      default:
        return "bi-info-circle-fill";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="erp-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`erp-toast toast-${toast.type}`}>
            <i className={`bi ${getIcon(toast.type)} erp-toast-icon`}></i>
            <div className="erp-toast-content">
              <div className="erp-toast-message">{toast.message}</div>
            </div>
            <button
              className="erp-toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastContext;

