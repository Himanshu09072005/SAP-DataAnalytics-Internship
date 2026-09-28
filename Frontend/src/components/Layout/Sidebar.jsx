import { useAppNavigation } from "../../router/Router";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { currentPath, navigate } = useAppNavigation();
  const { logout, user } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    if (mobileOpen) setMobileOpen(false);
  };

  const navSections = [
    {
      label: "Overview",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: "bi-speedometer2" },
      ],
    },
    {
      label: "Master Data",
      items: [
        { path: "/materials", label: "Materials", icon: "bi-box-seam" },
        { path: "/vendors", label: "Vendors", icon: "bi-buildings" },
        { path: "/material-vendors", label: "Material Vendors", icon: "bi-diagram-3" },
      ],
    },
    {
      label: "Procurement",
      items: [
        { path: "/purchase-requisitions", label: "Purchase Requisitions", icon: "bi-file-earmark-text" },
        { path: "/purchase-orders", label: "Purchase Orders", icon: "bi-cart-check" },
        { path: "/goods-receipts", label: "Goods Receipts", icon: "bi-truck" },
      ],
    },
    {
      label: "Finance",
      items: [
        { path: "/invoices", label: "Invoices", icon: "bi-receipt" },
        { path: "/payments", label: "Payments", icon: "bi-credit-card" },
      ],
    },
    {
      label: "Inventory",
      items: [
        { path: "/inventory", label: "Inventory Overview", icon: "bi-stack" },
      ],
    },
    {
      label: "Administration",
      items: [
        { path: "/profile", label: "Users & Profile", icon: "bi-person-badge" },
      ],
    },
    {
      label: "System",
      items: [
        { path: "/settings", label: "Settings", icon: "bi-gear" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="erp-sidebar-backdrop d-lg-none"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

      <aside className={`erp-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="erp-sidebar-brand d-flex justify-content-between align-items-center">
          <div
            className="d-flex align-items-center cursor-pointer"
            onClick={() => handleNav("/dashboard")}
            style={{ cursor: "pointer" }}
          >
            <div className="brand-icon">
              <i className="bi bi-boxes"></i>
            </div>
            {!collapsed && (
              <div className="brand-text">
                <div style={{ lineHeight: 1.15 }}>SAP Procurement</div>
                <small style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 500 }}>
                  ERP Management
                </small>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            className="btn btn-link text-secondary p-0 d-none d-lg-block"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{ fontSize: "1.1rem" }}
          >
            <i className={`bi ${collapsed ? "bi-chevron-double-right" : "bi-chevron-double-left"}`}></i>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="erp-sidebar-menu">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-2">
              <div className="erp-menu-section-label">{section.label}</div>
              {section.items.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    className={`erp-menu-item ${isActive ? "active" : ""}`}
                    onClick={() => handleNav(item.path)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="menu-icon">
                      <i className={`bi ${item.icon}`}></i>
                    </span>
                    <span className="menu-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="erp-sidebar-footer">
          {!collapsed && user && (
            <div className="d-flex align-items-center mb-2 px-1 text-truncate">
              <div className="erp-avatar me-2" style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}>
                {user.FullName ? user.FullName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-truncate" style={{ lineHeight: 1.2 }}>
                <div className="text-white small fw-semibold text-truncate">{user.FullName || user.Username}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{user.Role}</div>
              </div>
            </div>
          )}

          <button
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={logout}
            title="Logout"
          >
            <i className="bi bi-box-arrow-right"></i>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

