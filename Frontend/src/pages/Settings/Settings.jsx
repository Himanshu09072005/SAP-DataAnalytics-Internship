import { useState, useEffect } from "react";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [pingStatus, setPingStatus] = useState({ checking: false, success: null, message: "", latency: null });

  const testBackendConnection = async () => {
    setPingStatus({ checking: true, success: null, message: "", latency: null });
    const start = performance.now();
    try {
      const res = await client.get("/");
      const end = performance.now();
      const latencyMs = Math.round(end - start);
      setPingStatus({
        checking: false,
        success: true,
        message: res.data?.message || "FastAPI backend responding normally.",
        latency: latencyMs,
      });
      showToast("Backend connection verified successfully.", "success");
    } catch (err) {
      setPingStatus({
        checking: false,
        success: false,
        message: err.friendlyMessage || "Could not communicate with the backend server.",
        latency: null,
      });
      showToast("Backend health check failed.", "error");
    }
  };

  useEffect(() => {
    testBackendConnection();
  }, []);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">System Configuration & Health</h4>
          <p className="text-muted small mb-0">
            Environment runtime settings, API connectivity telemetry, and system architecture details.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={testBackendConnection}
          disabled={pingStatus.checking}
        >
          <i className={`bi bi-arrow-clockwise me-1 ${pingStatus.checking ? "spin" : ""}`}></i>
          Test API Connectivity
        </button>
      </div>

      <div className="row g-4 mb-4">
        {/* API Health Card */}
        <div className="col-12 col-lg-6">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-activity text-primary"></i>
                Backend Connectivity
              </h5>
              {pingStatus.success === true && (
                <span className="badge bg-success">ONLINE</span>
              )}
              {pingStatus.success === false && (
                <span className="badge bg-danger">OFFLINE</span>
              )}
            </div>
            <div className="erp-card-body">
              <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fs-3"
                  style={{
                    width: "50px",
                    height: "50px",
                    backgroundColor: pingStatus.success ? "#ecfdf5" : "#fef2f2",
                    color: pingStatus.success ? "#10b981" : "#ef4444",
                  }}
                >
                  <i
                    className={`bi ${
                      pingStatus.success ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"
                    }`}
                  ></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">
                    {pingStatus.success ? "FastAPI Services Operational" : "Connectivity Issue"}
                  </h6>
                  <div className="text-muted small">
                    {pingStatus.message || "Awaiting ping test response..."}
                  </div>
                </div>
              </div>

              <div className="row g-3 small">
                <div className="col-6">
                  <span className="text-muted d-block">Base API Target</span>
                  <code className="small text-primary">
                    {import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}
                  </code>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Response Latency</span>
                  <span className="fw-semibold font-monospace">
                    {pingStatus.latency !== null ? `${pingStatus.latency} ms` : "N/A"}
                  </span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Protocol</span>
                  <span>HTTP REST with CORS Headers</span>
                </div>
                <div className="col-6">
                  <span className="text-muted d-block">Authentication Header</span>
                  <span>Bearer JWT Token</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Architecture Info */}
        <div className="col-12 col-lg-6">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-cpu text-primary"></i>
                Technology Stack & Environment
              </h5>
            </div>
            <div className="erp-card-body">
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Application Identity</span>
                  <span className="fw-semibold">SAP-Inspired Procurement ERP</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Frontend Framework</span>
                  <span className="fw-semibold">React 19 + Vite 8</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">UI Component System</span>
                  <span className="fw-semibold">Bootstrap 5 + Custom Enterprise Theme</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Backend Application</span>
                  <span className="fw-semibold">Python FastAPI + Pydantic v2</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">ORM & Data Layer</span>
                  <span className="fw-semibold">SQLAlchemy 2.0</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Relational Database</span>
                  <span className="fw-semibold">MySQL 8.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Context Notice */}
        <div className="col-12">
          <div className="erp-card mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-mortarboard text-primary"></i>
                Internship Project Declaration
              </h5>
            </div>
            <div className="erp-card-body small text-secondary">
              <p className="mb-2">
                This software is designed as an educational and internship demonstration project demonstrating enterprise ERP procurement mechanics, relational database integrity, and decoupled API architectures.
              </p>
              <p className="mb-0 text-muted">
                <strong>Disclaimer:</strong> This project is an independent educational implementation inspired by enterprise ERP workflows and is not affiliated with or endorsed by SAP SE.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

