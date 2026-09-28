import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/auth";
import dashboardApi from "../../api/dashboard";
import StatCard from "../../components/Common/StatCard";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import { useToast } from "../../context/ToastContext";

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    roles: {},
  });

  // Register Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const initialRegisterForm = {
    FullName: "",
    Username: "",
    Email: "",
    Password: "",
    Role: "Purchase Officer",
    Department: "Procurement",
    Phone: "",
  };

  const [registerForm, setRegisterForm] = useState(initialRegisterForm);

  const loadUserTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getUsers();
      setUserStats(data || {});
      await refreshProfile();
    } catch (err) {
      showToast("Could not retrieve user directory metrics.", "warning");
    } finally {
      setLoading(false);
    }
  }, [refreshProfile, showToast]);

  useEffect(() => {
    loadUserTelemetry();
  }, [loadUserTelemetry]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await authApi.register({
        FullName: registerForm.FullName.trim(),
        Username: registerForm.Username.trim(),
        Email: registerForm.Email.trim(),
        Password: registerForm.Password,
        Role: registerForm.Role,
        Department: registerForm.Department.trim() || undefined,
        Phone: registerForm.Phone.trim() || undefined,
      });

      showToast(`User "${registerForm.Username}" registered successfully.`, "success");
      setRegisterModalOpen(false);
      setRegisterForm(initialRegisterForm);
      loadUserTelemetry();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to register user.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving identity and user management metrics..." fullPage />;
  }

  const roleEntries = Object.entries(userStats.roles || {});

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">User Identity & Directory</h4>
          <p className="text-muted small mb-0">
            Account authentication profile, access roles, and organizational personnel management.
          </p>
        </div>
        <button
          className="btn btn-erp-primary"
          onClick={() => setRegisterModalOpen(true)}
        >
          <i className="bi bi-person-plus"></i>
          <span>Onboard New Staff</span>
        </button>
      </div>

      <div className="row g-4 mb-4">
        {/* Current Logged-in User Profile Card */}
        <div className="col-12 col-lg-5">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-person-badge text-primary"></i>
                My Identity Profile
              </h5>
              <StatusBadge status={user?.Status || "Active"} />
            </div>
            <div className="erp-card-body">
              <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <div
                  className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold fs-3 shadow-sm"
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "linear-gradient(135deg, #0064d2, #38bdf8)",
                  }}
                >
                  {user?.FullName ? user.FullName.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-dark">{user?.FullName || user?.Username}</h5>
                  <div className="text-muted small">{user?.Email}</div>
                  <span className="badge bg-primary-subtle text-primary mt-1">
                    {user?.Role || "Procurement Officer"}
                  </span>
                </div>
              </div>

              <div className="row g-3 small">
                <div className="col-6">
                  <span className="text-muted d-block">System User ID</span>
                  <span className="fw-bold font-monospace">#{user?.UserID || "-"}</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Login Username</span>
                  <span className="fw-semibold text-dark">{user?.Username}</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Department</span>
                  <span className="fw-semibold">{user?.Department || "General"}</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Contact Phone</span>
                  <span>{user?.Phone || "Not provided"}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-light rounded-3 small text-secondary border">
                <div className="fw-bold text-dark mb-1">
                  <i className="bi bi-shield-check text-success me-1"></i> Authentication Standard
                </div>
                Signed in via OAuth2 JWT Bearer Token. Authorization credentials are stored securely in local browser storage and authenticated against FastAPI.
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Personnel Statistics */}
        <div className="col-12 col-lg-7">
          <div className="row g-3 mb-3">
            <div className="col-sm-4">
              <StatCard
                title="Total Personnel"
                value={userStats.total_users}
                icon="bi-people"
                variant="blue"
                subtext="Registered Accounts"
              />
            </div>
            <div className="col-sm-4">
              <StatCard
                title="Active Accounts"
                value={userStats.active_users}
                icon="bi-check-circle"
                variant="green"
                subtext="Operational Access"
              />
            </div>
            <div className="col-sm-4">
              <StatCard
                title="Inactive Accounts"
                value={userStats.inactive_users}
                icon="bi-dash-circle"
                variant="orange"
                subtext="Suspended / Inactive"
              />
            </div>
          </div>

          <div className="erp-card mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-diagram-2 text-primary"></i>
                Role Distribution
              </h5>
              <span className="badge bg-light text-secondary border">Real User Schema</span>
            </div>
            <div className="erp-card-body">
              <div className="d-flex flex-column gap-3">
                {roleEntries.map(([roleName, count], idx) => {
                  const maxCount = Math.max(...roleEntries.map(([, c]) => c), 1);
                  const pct = Math.round((count / maxCount) * 100);

                  return (
                    <div key={idx}>
                      <div className="d-flex justify-content-between small fw-semibold mb-1">
                        <span>{roleName}</span>
                        <span>{count} user(s)</span>
                      </div>
                      <div className="progress" style={{ height: "6px", backgroundColor: "#f1f5f9" }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: `${pct}%`, borderRadius: "3px" }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTER NEW USER MODAL */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Onboard New System User"
        icon="bi-person-plus-fill"
        size="lg"
      >
        <form onSubmit={handleRegisterSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Anand Sharma"
                value={registerForm.FullName}
                onChange={(e) => setRegisterForm({ ...registerForm, FullName: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Username <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. asharma"
                value={registerForm.Username}
                onChange={(e) => setRegisterForm({ ...registerForm, Username: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="asharma@company.com"
                value={registerForm.Email}
                onChange={(e) => setRegisterForm({ ...registerForm, Email: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                className="form-control form-control-sm"
                placeholder="Secure temporary password"
                value={registerForm.Password}
                onChange={(e) => setRegisterForm({ ...registerForm, Password: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">System Role</label>
              <select
                className="form-select form-select-sm"
                value={registerForm.Role}
                onChange={(e) => setRegisterForm({ ...registerForm, Role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Purchase Officer">Purchase Officer</option>
                <option value="Inventory Manager">Inventory Manager</option>
                <option value="Finance">Finance</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Department</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Supply Chain"
                value={registerForm.Department}
                onChange={(e) => setRegisterForm({ ...registerForm, Department: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Phone Number</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="+91 9876543210"
                value={registerForm.Phone}
                onChange={(e) => setRegisterForm({ ...registerForm, Phone: e.target.value })}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setRegisterModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-erp-primary btn-sm" disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Registering...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

