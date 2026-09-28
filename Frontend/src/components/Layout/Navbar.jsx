import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppNavigation } from "../../router/Router";

export default function Navbar({ onToggleMobileSidebar }) {
  const { user, logout } = useAuth();
  const { currentPath, navigate } = useAppNavigation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const getPageInfo = (path) => {
    switch (path) {
      case "/dashboard":
        return { title: "Executive Dashboard", breadcrumb: "Overview / Dashboard" };
      case "/materials":
        return { title: "Material Master Data", breadcrumb: "Master Data / Materials" };
      case "/vendors":
        return { title: "Vendor Master Data", breadcrumb: "Master Data / Vendors" };
      case "/material-vendors":
        return { title: "Material-Vendor Relationships", breadcrumb: "Master Data / Material Vendors" };
      case "/purchase-requisitions":
        return { title: "Purchase Requisitions", breadcrumb: "Procurement / Purchase Requisitions" };
      case "/purchase-orders":
        return { title: "Purchase Orders", breadcrumb: "Procurement / Purchase Orders" };
      case "/goods-receipts":
        return { title: "Goods Receipts (GRN)", breadcrumb: "Procurement / Goods Receipts" };
      case "/invoices":
        return { title: "Vendor Invoices", breadcrumb: "Finance / Invoices" };
      case "/payments":
        return { title: "Payment Transactions", breadcrumb: "Finance / Payments" };
      case "/inventory":
        return { title: "Inventory & Stock Status", breadcrumb: "Inventory / Stock Overview" };
      case "/profile":
        return { title: "User Profile & Management", breadcrumb: "Administration / Profile" };
      case "/settings":
        return { title: "System Settings", breadcrumb: "System / Settings" };
      default:
        return { title: "Procurement ERP", breadcrumb: "SAP-Inspired ERP" };
    }
  };

  const pageInfo = getPageInfo(currentPath);

  return (
    <header className="erp-navbar">
      {/* Left side: Hamburger for mobile + Page Title */}
      <div className="erp-nav-left">
        <button
          className="btn btn-outline-secondary btn-sm d-lg-none"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          <i className="bi bi-list fs-5"></i>
        </button>
        <div>
          <h1 className="erp-nav-title">{pageInfo.title}</h1>
          <span className="erp-nav-breadcrumb">{pageInfo.breadcrumb}</span>
        </div>
      </div>

      {/* Right side: Notifications & User Profile */}
      <div className="erp-nav-right">
        {/* Notifications Popover */}
        <div className="position-relative">
          <button
            className="btn btn-light rounded-circle p-2 text-secondary position-relative"
            onClick={() => setNotificationOpen(!notificationOpen)}
            title="System Notifications"
            aria-label="Notifications"
          >
            <i className="bi bi-bell fs-6"></i>
            <span
              className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
              style={{ width: "8px", height: "8px" }}
            ></span>
          </button>

          {notificationOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-3"
              style={{ width: "280px", zIndex: 1050 }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <span className="fw-semibold small">System Notifications</span>
                <span className="badge bg-primary-subtle text-primary" style={{ fontSize: "0.68rem" }}>
                  Active
                </span>
              </div>
              <div className="small text-muted mb-2">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-shield-check text-success"></i>
                  <span>Connected to FastAPI backend</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-database-check text-primary"></i>
                  <span>MySQL Database connected</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-secondary"></i>
                  <span>Live procurement monitoring active</span>
                </div>
              </div>
              <button
                className="btn btn-outline-secondary btn-sm w-100 mt-1"
                onClick={() => setNotificationOpen(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="position-relative">
          <div
            className="erp-user-badge"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            role="button"
          >
            <div className="erp-avatar">
              {user?.FullName ? user.FullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="erp-user-info d-none d-sm-flex">
              <span className="erp-user-name">{user?.FullName || user?.Username || "User"}</span>
              <span className="erp-user-role">{user?.Role || "Procurement User"}</span>
            </div>
            <i className="bi bi-chevron-down text-muted small ms-1"></i>
          </div>

          {dropdownOpen && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border py-2"
              style={{ width: "220px", zIndex: 1050 }}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-2 border-bottom">
                <div className="fw-bold small text-dark">{user?.FullName || "ERP User"}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {user?.Email || "erp@system.local"}
                </div>
                <span className="badge bg-info-subtle text-info mt-1" style={{ fontSize: "0.7rem" }}>
                  {user?.Role || "Employee"}
                </span>
              </div>

              <button
                className="dropdown-item px-3 py-2 d-flex align-items-center gap-2 text-secondary small"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/profile");
                }}
              >
                <i className="bi bi-person"></i> View Profile
              </button>

              <button
                className="dropdown-item px-3 py-2 d-flex align-items-center gap-2 text-secondary small"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
              >
                <i className="bi bi-gear"></i> System Settings
              </button>

              <div className="dropdown-divider my-1"></div>

              <button
                className="dropdown-item px-3 py-2 d-flex align-items-center gap-2 text-danger small"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

