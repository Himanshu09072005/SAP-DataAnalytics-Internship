import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppNavigation } from "../../router/Router";
import { useToast } from "../../context/ToastContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const { navigate } = useAppNavigation();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(username, password);
      showToast("Authentication successful. Welcome to SAP Procurement ERP!", "success");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.friendlyMessage || "Invalid username or password.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-login-wrapper">
      {/* Left side: Enterprise Branding & Overview */}
      <div className="erp-login-left">
        <div className="erp-login-brand-logo">
          <i className="bi bi-boxes"></i>
        </div>
        <h1 className="fw-bold mb-2 display-6">SAP-Inspired Procurement ERP</h1>
        <p className="text-light opacity-75 mb-4" style={{ maxWidth: "480px", fontSize: "1.05rem" }}>
          Enterprise Management System for Procurement Lifecycles, Material Master Data, Vendor Relations, Goods Receipts, and Financial Settlement.
        </p>

        <div className="d-flex flex-column gap-3 mt-2" style={{ maxWidth: "420px" }}>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-25 rounded-circle text-info">
              <i className="bi bi-check-circle-fill"></i>
            </div>
            <div>
              <div className="fw-semibold small">End-to-End Procurement</div>
              <div className="small text-light opacity-75">Requisitions, Purchase Orders & Inspection</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-25 rounded-circle text-info">
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <div>
              <div className="fw-semibold small">Secure Role-Based Access</div>
              <div className="small text-light opacity-75">FastAPI & JWT Token Bearer Security</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-25 rounded-circle text-info">
              <i className="bi bi-graph-up-arrow"></i>
            </div>
            <div>
              <div className="fw-semibold small">Real-Time Analytics</div>
              <div className="small text-light opacity-75">Live SQL Database Telemetry & Visualizations</div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-light opacity-50 small">
          College Internship Project • Powered by FastAPI & React 19
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="erp-login-right">
        <div className="erp-login-card">
          <div className="text-center mb-4">
            <h3 className="fw-bold text-dark mb-1">System Sign In</h3>
            <p className="text-muted small">Enter your credentials to access the ERP dashboard</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 small mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Username</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="e.g. admin or employee"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-semibold text-secondary mb-0">Password</label>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control border-start-0 border-end-0"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-group-text bg-light text-muted border-start-0 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-erp-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-top text-center">
            <span className="text-muted small">
              Connected to backend at{" "}
              <code>{import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

