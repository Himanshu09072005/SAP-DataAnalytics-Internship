import { useState, useEffect, useCallback } from "react";
import dashboardApi from "../../api/dashboard";
import StatCard from "../../components/Common/StatCard";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import { BarChart, DonutChart, HorizontalBarChart } from "../../components/Common/SimpleCharts";
import { useAppNavigation } from "../../router/Router";
import { useToast } from "../../context/ToastContext";

export default function Dashboard() {
  const { navigate } = useAppNavigation();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_users: 0,
    total_vendors: 0,
    total_materials: 0,
    total_purchase_requisitions: 0,
    total_purchase_orders: 0,
    total_goods_receipts: 0,
    total_invoices: 0,
    total_payments: 0,
    total_inventory_value: 0,
    total_invoice_value: 0,
    total_amount_paid: 0,
  });

  const [monthlyPurchases, setMonthlyPurchases] = useState([]);
  const [prStatus, setPrStatus] = useState({});
  const [poStatus, setPoStatus] = useState({});
  const [invoiceStatus, setInvoiceStatus] = useState({});
  const [topMaterials, setTopMaterials] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({ reorder_materials: 0 });

  const loadAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        summaryData,
        monthlyData,
        prData,
        poData,
        invoiceData,
        topMatData,
        invData,
      ] = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getMonthlyPurchases(),
        dashboardApi.getPrStatus(),
        dashboardApi.getPoStatus(),
        dashboardApi.getInvoices(),
        dashboardApi.getTopMaterials(),
        dashboardApi.getInventory(),
      ]);

      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (monthlyData.status === "fulfilled") setMonthlyPurchases(monthlyData.value);
      if (prData.status === "fulfilled") setPrStatus(prData.value);
      if (poData.status === "fulfilled") setPoStatus(poData.value);
      if (invoiceData.status === "fulfilled") setInvoiceStatus(invoiceData.value);
      if (topMatData.status === "fulfilled") setTopMaterials(topMatData.value);
      if (invData.status === "fulfilled") setInventoryStats(invData.value);
    } catch (err) {
      console.error("Error loading dashboard telemetry:", err);
      showToast("Could not load full dashboard metrics from backend.", "warning");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]);

  // Format Monthly Purchases for BarChart
  const formattedMonthlyChart = Array.isArray(monthlyPurchases)
    ? monthlyPurchases.map((m) => ({
        label: m.month ? m.month.substring(0, 3) : "Mo",
        value: m.total_purchase_amount || 0,
      }))
    : [];

  // Format PR Status for DonutChart
  const formattedPrDonut = [
    { label: "Approved", value: prStatus.Approved || 0, color: "#10b981" },
    { label: "Pending", value: prStatus.Pending || 0, color: "#f59e0b" },
    { label: "Ordered", value: prStatus.Ordered || 0, color: "#0064d2" },
    { label: "Rejected", value: prStatus.Rejected || 0, color: "#ef4444" },
  ];

  // Format Invoice Status for DonutChart
  const formattedInvoiceDonut = [
    { label: "Paid", value: invoiceStatus.Paid || 0, color: "#10b981" },
    { label: "Partially Paid", value: invoiceStatus["Partially Paid"] || 0, color: "#0284c7" },
    { label: "Pending", value: invoiceStatus.Pending || 0, color: "#f59e0b" },
  ];

  // Format Top Materials for HorizontalBarChart
  const formattedTopMaterials = Array.isArray(topMaterials)
    ? topMaterials.map((tm) => ({
        label: tm.material_name,
        value: tm.total_requested_quantity,
      }))
    : [];

  if (loading) {
    return <LoadingSpinner text="Connecting to ERP telemetry services..." fullPage />;
  }

  return (
    <div>
      {/* Critical Reorder Alert Banner */}
      {inventoryStats.reorder_materials > 0 && (
        <div
          className="alert alert-warning border-warning d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm"
          role="alert"
        >
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
            <div>
              <strong className="d-block">Material Stock Replenishment Alert</strong>
              <span className="small text-secondary">
                {inventoryStats.reorder_materials} material item(s) are currently at or below minimum reorder thresholds.
              </span>
            </div>
          </div>
          <button
            className="btn btn-warning btn-sm fw-semibold"
            onClick={() => navigate("/inventory")}
          >
            Review Inventory <i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      )}

      {/* Row 1: Primary Procurement Metrics */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Materials"
            value={summary.total_materials}
            icon="bi-box-seam"
            variant="blue"
            subtext="Master Catalog Items"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Vendors"
            value={summary.total_vendors}
            icon="bi-buildings"
            variant="green"
            subtext="Registered Suppliers"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Purchase Requisitions"
            value={summary.total_purchase_requisitions}
            icon="bi-file-earmark-text"
            variant="orange"
            subtext="Created Requisitions"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Purchase Orders"
            value={summary.total_purchase_orders}
            icon="bi-cart-check"
            variant="red"
            subtext="Active & Completed POs"
          />
        </div>
      </div>

      {/* Row 2: Secondary Operational Metrics */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Goods Receipts"
            value={summary.total_goods_receipts}
            icon="bi-truck"
            variant="purple"
            subtext="Warehouse Receipts (GRN)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Vendor Invoices"
            value={summary.total_invoices}
            icon="bi-receipt"
            variant="info"
            subtext="Invoiced Deliveries"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Completed Payments"
            value={summary.total_payments}
            icon="bi-credit-card"
            variant="green"
            subtext="Disbursements Executed"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="System Users"
            value={summary.total_users}
            icon="bi-people"
            variant="blue"
            subtext="Authorized Personnel"
          />
        </div>
      </div>

      {/* Row 3: Financial Valuation Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100" style={{ borderLeft: "4px solid #0064d2" }}>
            <div className="text-muted small text-uppercase fw-semibold mb-1">Total Inventory Valuation</div>
            <div className="fs-3 fw-bold text-dark">
              ₹{Number(summary.total_inventory_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="small text-muted mt-1">Asset value in stock warehouse</div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100" style={{ borderLeft: "4px solid #f59e0b" }}>
            <div className="text-muted small text-uppercase fw-semibold mb-1">Total Invoiced Commitment</div>
            <div className="fs-3 fw-bold text-dark">
              ₹{Number(summary.total_invoice_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="small text-muted mt-1">Gross supplier billings with GST</div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100" style={{ borderLeft: "4px solid #10b981" }}>
            <div className="text-muted small text-uppercase fw-semibold mb-1">Total Capital Disbursed</div>
            <div className="fs-3 fw-bold text-dark">
              ₹{Number(summary.total_amount_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="small text-muted mt-1">Settled payments to vendors</div>
          </div>
        </div>
      </div>

      {/* Row 4: Real-time Analytics Charts */}
      <div className="row g-3 mb-4">
        {/* Monthly Purchase Spend Bar Chart */}
        <div className="col-12 col-lg-7">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-graph-up text-primary"></i>
                Monthly Procurement Spend
              </h5>
              <span className="badge bg-light text-secondary border">Real PO Data</span>
            </div>
            <div className="erp-card-body">
              {formattedMonthlyChart.length > 0 ? (
                <BarChart
                  data={formattedMonthlyChart}
                  height={260}
                  valuePrefix="₹"
                />
              ) : (
                <div className="text-center text-muted py-5 small">
                  No monthly purchase order data recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PR Status Breakdown Donut Chart */}
        <div className="col-12 col-lg-5">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-pie-chart text-primary"></i>
                Requisition Status Flow
              </h5>
              <button
                className="btn btn-link btn-sm p-0 text-decoration-none"
                onClick={() => navigate("/purchase-requisitions")}
              >
                View Requisitions
              </button>
            </div>
            <div className="erp-card-body d-flex align-items-center justify-content-center">
              <DonutChart data={formattedPrDonut} centerLabel="Total PRs" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Top Requested Materials & Invoice Settlement */}
      <div className="row g-3 mb-4">
        {/* Top 10 Requested Materials */}
        <div className="col-12 col-lg-6">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-award text-primary"></i>
                Top Requested Materials
              </h5>
              <span className="badge bg-light text-secondary border">Quantity Rank</span>
            </div>
            <div className="erp-card-body">
              {formattedTopMaterials.length > 0 ? (
                <HorizontalBarChart data={formattedTopMaterials} valueSuffix=" units" />
              ) : (
                <div className="text-center text-muted py-5 small">
                  No material requisition volume recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Payment Status */}
        <div className="col-12 col-lg-6">
          <div className="erp-card h-100 mb-0">
            <div className="erp-card-header">
              <h5 className="erp-card-title">
                <i className="bi bi-cash-coin text-primary"></i>
                Invoice Settlement Status
              </h5>
              <button
                className="btn btn-link btn-sm p-0 text-decoration-none"
                onClick={() => navigate("/invoices")}
              >
                View Invoices
              </button>
            </div>
            <div className="erp-card-body d-flex align-items-center justify-content-center">
              <DonutChart data={formattedInvoiceDonut} centerLabel="Invoices" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="erp-card">
        <div className="erp-card-header">
          <h5 className="erp-card-title">
            <i className="bi bi-lightning-charge text-primary"></i>
            Procurement Quick Actions
          </h5>
        </div>
        <div className="erp-card-body">
          <div className="row g-2">
            <div className="col-6 col-md-3">
              <button
                className="btn btn-outline-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate("/purchase-requisitions")}
              >
                <i className="bi bi-file-earmark-plus"></i>
                <span className="small fw-semibold">New Requisition</span>
              </button>
            </div>
            <div className="col-6 col-md-3">
              <button
                className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate("/purchase-orders")}
              >
                <i className="bi bi-cart-plus"></i>
                <span className="small fw-semibold">Generate PO</span>
              </button>
            </div>
            <div className="col-6 col-md-3">
              <button
                className="btn btn-outline-success w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate("/goods-receipts")}
              >
                <i className="bi bi-box-arrow-in-down"></i>
                <span className="small fw-semibold">Receive Goods</span>
              </button>
            </div>
            <div className="col-6 col-md-3">
              <button
                className="btn btn-outline-info w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate("/invoices")}
              >
                <i className="bi bi-receipt-cutoff"></i>
                <span className="small fw-semibold">Process Invoices</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

