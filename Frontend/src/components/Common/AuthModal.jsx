import { useState } from "react";
import authApi from "../../api/auth";

export default function AuthModal({ isOpen, onClose, onSuccess, actionName }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await authApi.login(username.trim(), password);
      const token = data.access_token;
      localStorage.setItem("token", token);

      let userProfile = null;
      try {
        userProfile = await authApi.getMe();
      } catch {
        // Fallback profile if getMe has transient issue
        userProfile = { Username: username, Role: "Admin" };
      }

      onSuccess(token, userProfile);
    } catch (err) {
      const msg = err.friendlyMessage || "Invalid username or password. Please verify credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="erp-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="erp-modal modal-md">
        <div className="erp-modal-header bg-light border-bottom">
          <h5 className="erp-modal-title d-flex align-items-center gap-2">
            <span className="p-1 bg-primary bg-opacity-10 text-primary rounded">
              <i className="bi bi-shield-lock-fill"></i>
            </span>
            <span>Authentication Required</span>
          </h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
            disabled={loading}
          ></button>
        </div>

        <div className="erp-modal-body p-4">
          <div className="alert alert-info py-2 px-3 small d-flex align-items-start gap-2 mb-3">
            <i className="bi bi-info-circle-fill text-info flex-shrink-0 mt-1"></i>
            <div>
              <span>You are currently in read-only visitor mode. </span>
              {actionName ? (
                <span>
                  To <strong>{actionName}</strong>, please authenticate with an authorized account.
                </span>
              ) : (
                <span>Please sign in with authorized credentials to modify database records.</span>
              )}
              <div className="mt-1 text-muted">
                Demo Admin Account: <code>himanshu</code> / <code>Admin@123</code>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
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
                  placeholder="e.g. himanshu"
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
              <label className="form-label small fw-semibold text-secondary">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control border-start-0 border-end-0"
                  placeholder="e.g. Admin@123"
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

            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-erp-primary btn-sm px-4 d-flex align-items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right"></i>
                    <span>Authenticate & Proceed</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

