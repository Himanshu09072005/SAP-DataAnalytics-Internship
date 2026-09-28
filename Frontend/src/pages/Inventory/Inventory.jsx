import { useState, useEffect, useCallback, useMemo } from "react";
import dashboardApi from "../../api/dashboard";
import materialsApi from "../../api/materials";
import DataTable from "../../components/Common/DataTable";
import StatCard from "../../components/Common/StatCard";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import { useAppNavigation } from "../../router/Router";
import { useToast } from "../../context/ToastContext";

export default function Inventory() {
  const { navigate } = useAppNavigation();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState({
    total_stock: 0,
    inventory_value: 0,
    reorder_materials: 0,
  });
  const [materials, setMaterials] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, matRes] = await Promise.all([
        dashboardApi.getInventory(),
        materialsApi.getAll(),
      ]);

      setInventoryStats(invRes || {});
      setMaterials(Array.isArray(matRes) ? matRes : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load inventory data.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive counts
  const stockMetrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    materials.forEach((m) => {
      const stock = Number(m.CurrentStock) || 0;
      const reorder = Number(m.ReorderLevel) || 0;
      if (stock <= 0) outOfStock++;
      else if (stock <= reorder) lowStock++;
      else inStock++;
    });

    return { inStock, lowStock, outOfStock };
  }, [materials]);

  // Enhanced materials with calculated stock category
  const inventoryItems = useMemo(() => {
    return materials.map((m) => {
      const stock = Number(m.CurrentStock) || 0;
      const reorder = Number(m.ReorderLevel) || 0;
      let stockCategory = "IN STOCK";
      if (stock <= 0) stockCategory = "OUT OF STOCK";
      else if (stock <= reorder) stockCategory = "LOW STOCK";

      const totalValuation = stock * (parseFloat(m.UnitPrice) || 0);

      return {
        ...m,
        StockCategory: stockCategory,
        TotalValuation: totalValuation,
      };
    });
  }, [materials]);

  const filterConfigs = useMemo(() => {
    const plants = Array.from(new Set(materials.map((m) => m.Plant).filter(Boolean))).map(
      (p) => ({ label: p, value: p })
    );
    const locations = Array.from(new Set(materials.map((m) => m.StorageLocation).filter(Boolean))).map(
      (l) => ({ label: l, value: l })
    );

    return [
      {
        key: "StockCategory",
        label: "Stock Status",
        options: [
          { label: "IN STOCK", value: "IN STOCK" },
          { label: "LOW STOCK", value: "LOW STOCK" },
          { label: "OUT OF STOCK", value: "OUT OF STOCK" },
        ],
      },
      { key: "Plant", label: "Plants", options: plants },
      { key: "StorageLocation", label: "Locations", options: locations },
    ];
  }, [materials]);

  const columns = [
    {
      key: "MaterialCode",
      label: "Code",
      sortable: true,
      render: (val) => <span className="badge bg-secondary-subtle text-dark font-monospace">{val}</span>,
    },
    {
      key: "MaterialName",
      label: "Material Description",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="fw-semibold text-dark">{val}</span>
          <div className="small text-muted">{row.Category} • {row.MaterialType}</div>
        </div>
      ),
    },
    {
      key: "Plant",
      label: "Facility / Plant",
      sortable: true,
      render: (val, row) => (
        <span className="small text-secondary">
          {val} - {row.StorageLocation}
        </span>
      ),
    },
    {
      key: "CurrentStock",
      label: "Stock Level",
      sortable: true,
      align: "right",
      render: (val, row) => {
        const stock = Number(val);
        const reorder = Number(row.ReorderLevel);
        const ratio = reorder > 0 ? Math.min(100, Math.round((stock / (reorder * 2)) * 100)) : 100;
        const barColor = stock <= 0 ? "#ef4444" : stock <= reorder ? "#f59e0b" : "#10b981";

        return (
          <div style={{ minWidth: "120px" }}>
            <div className="d-flex justify-content-between small mb-1">
              <span className="fw-bold">{stock} {row.UnitOfMeasure}</span>
              <span className="text-muted">Min: {reorder}</span>
            </div>
            <div className="progress" style={{ height: "5px", backgroundColor: "#f1f5f9" }}>
              <div
                className="progress-bar"
                style={{ width: `${ratio}%`, backgroundColor: barColor }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: "StockCategory",
      label: "Health Status",
      sortable: true,
      render: (val) => {
        if (val === "OUT OF STOCK") return <span className="badge bg-danger">OUT OF STOCK</span>;
        if (val === "LOW STOCK") return <span className="badge bg-warning text-dark">REORDER REQUIRED</span>;
        return <span className="badge bg-success-subtle text-success border border-success-subtle">IN STOCK</span>;
      },
    },
    {
      key: "UnitPrice",
      label: "Unit Cost",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="small text-secondary">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "TotalValuation",
      label: "Stock Valuation",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-bold text-dark">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Analyzing warehouse inventory telemetries..." fullPage />;
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Warehouse Inventory & Valuation</h4>
          <p className="text-muted small mb-0">
            Real-time material physical stock quantities, bin storage allocations, and replenishment monitoring.
          </p>
        </div>
        <button
          className="btn btn-erp-primary"
          onClick={() => navigate("/purchase-requisitions")}
        >
          <i className="bi bi-cart-plus"></i>
          <span>Replenish Stock (Create PR)</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Physical Stock"
            value={inventoryStats.total_stock}
            icon="bi-box-seam"
            variant="blue"
            subtext="Units Across All Plants"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Asset Valuation"
            value={inventoryStats.inventory_value}
            prefix="₹"
            icon="bi-cash-stack"
            variant="green"
            subtext="Current Stock Asset Value"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Reorder Alerts"
            value={inventoryStats.reorder_materials}
            icon="bi-exclamation-triangle"
            variant={inventoryStats.reorder_materials > 0 ? "orange" : "blue"}
            subtext="Items Below Minimum Level"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Healthy Stock Items"
            value={stockMetrics.inStock}
            icon="bi-check-circle"
            variant="purple"
            subtext="Optimal Warehouse Levels"
          />
        </div>
      </div>

      {/* Reorder Required Alert Table Callout if any */}
      {inventoryStats.reorder_materials > 0 && (
        <div className="erp-card border-warning mb-4">
          <div className="erp-card-header bg-warning-subtle">
            <h5 className="erp-card-title text-warning-emphasis">
              <i className="bi bi-bell-fill"></i>
              Immediate Stock Replenishment Recommendations
            </h5>
            <span className="badge bg-warning text-dark">
              {inventoryStats.reorder_materials} Material(s)
            </span>
          </div>
          <div className="erp-card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                <thead className="table-light">
                  <tr>
                    <th>Material</th>
                    <th>Facility</th>
                    <th>Current Stock</th>
                    <th>Reorder Threshold</th>
                    <th>Suggested Shortfall</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems
                    .filter((m) => m.StockCategory !== "IN STOCK")
                    .map((item) => (
                      <tr key={item.MaterialID}>
                        <td>
                          <strong>{item.MaterialName}</strong>
                          <div className="font-monospace small text-primary">{item.MaterialCode}</div>
                        </td>
                        <td>{item.Plant} / {item.StorageLocation}</td>
                        <td className="text-danger fw-bold">{item.CurrentStock} {item.UnitOfMeasure}</td>
                        <td>{item.ReorderLevel} {item.UnitOfMeasure}</td>
                        <td className="fw-semibold text-warning-emphasis">
                          {Math.max(1, item.ReorderLevel - item.CurrentStock + 10)} {item.UnitOfMeasure}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => navigate("/purchase-requisitions")}
                          >
                            <i className="bi bi-cart-plus me-1"></i> Order Now
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Complete Stock Inventory Grid */}
      <DataTable
        columns={columns}
        data={inventoryItems}
        loading={loading}
        keyField="MaterialID"
        searchPlaceholder="Filter inventory by material name, code, plant..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
      />
    </div>
  );
}

