import { useState, useEffect, useCallback, useMemo } from "react";
import materialsApi from "../../api/materials";
import vendorsApi from "../../api/vendors";
import purchaseRequisitionsApi from "../../api/purchaseRequisitions";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import { useToast } from "../../context/ToastContext";

export default function MaterialVendors() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, vendRes, prRes] = await Promise.all([
        materialsApi.getAll(),
        vendorsApi.getAll(),
        purchaseRequisitionsApi.getAll(),
      ]);

      setMaterials(Array.isArray(matRes) ? matRes : []);
      setVendors(Array.isArray(vendRes) ? vendRes : []);
      setRequisitions(Array.isArray(prRes) ? prRes : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load master relationships.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive real relationship matrix from actual materials, vendors, and transactions
  const relationshipData = useMemo(() => {
    const matMap = new Map(materials.map((m) => [m.MaterialID, m]));
    const vendMap = new Map(vendors.map((v) => [v.VendorID, v]));

    // Track pairings from actual Purchase Requisitions
    const pairingMap = new Map();

    requisitions.forEach((pr) => {
      const key = `${pr.MaterialID}_${pr.VendorID}`;
      const mat = matMap.get(pr.MaterialID);
      const vend = vendMap.get(pr.VendorID);

      if (!pairingMap.has(key)) {
        pairingMap.set(key, {
          id: key,
          MaterialID: pr.MaterialID,
          VendorID: pr.VendorID,
          MaterialCode: mat?.MaterialCode || `MAT-${pr.MaterialID}`,
          MaterialName: mat?.MaterialName || "Unknown Material",
          Category: mat?.Category || "General",
          VendorCode: vend?.VendorCode || `VEND-${pr.VendorID}`,
          VendorName: vend?.VendorName || "Unknown Vendor",
          VendorCity: vend?.City || "-",
          VendorState: vend?.State || "-",
          UnitPrice: pr.UnitPrice || mat?.UnitPrice || 0,
          TotalTransactions: 1,
          TotalQuantityProcured: Number(pr.Quantity || 0),
          LastTransactionDate: pr.RequestDate,
          Status: vend?.Status === "Active" && mat?.Status === "Active" ? "Active" : "Inactive",
          IsDirectTransaction: true,
        });
      } else {
        const item = pairingMap.get(key);
        item.TotalTransactions += 1;
        item.TotalQuantityProcured += Number(pr.Quantity || 0);
        if (pr.RequestDate && (!item.LastTransactionDate || pr.RequestDate > item.LastTransactionDate)) {
          item.LastTransactionDate = pr.RequestDate;
        }
      }
    });

    return Array.from(pairingMap.values());
  }, [materials, vendors, requisitions]);

  const filterConfigs = useMemo(() => {
    const materialOptions = Array.from(new Set(relationshipData.map((r) => r.MaterialName))).map(
      (m) => ({ label: m, value: m })
    );
    const vendorOptions = Array.from(new Set(relationshipData.map((r) => r.VendorName))).map(
      (v) => ({ label: v, value: v })
    );

    return [
      { key: "MaterialName", label: "Materials", options: materialOptions },
      { key: "VendorName", label: "Vendors", options: vendorOptions },
      {
        key: "Status",
        label: "Statuses",
        options: [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ],
      },
    ];
  }, [relationshipData]);

  const columns = [
    {
      key: "MaterialCode",
      label: "Material",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="fw-semibold text-dark">{row.MaterialName}</span>
          <div className="small font-monospace text-primary">{val}</div>
        </div>
      ),
    },
    {
      key: "VendorName",
      label: "Approved Vendor",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="fw-semibold text-dark">{val}</span>
          <div className="small text-muted">{row.VendorCode} • {row.VendorCity}, {row.VendorState}</div>
        </div>
      ),
    },
    {
      key: "UnitPrice",
      label: "Contract Price",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-semibold text-dark">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "TotalTransactions",
      label: "PR Orders",
      sortable: true,
      align: "center",
      render: (val) => <span className="badge bg-light text-dark border">{val} Orders</span>,
    },
    {
      key: "TotalQuantityProcured",
      label: "Volume Procured",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="small fw-semibold text-secondary">
          {Number(val || 0).toLocaleString()} units
        </span>
      ),
    },
    {
      key: "LastTransactionDate",
      label: "Last Purchase Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val || "No transactions"}</span>,
    },
    {
      key: "Status",
      label: "Relationship",
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Material-Vendor Master Relations</h4>
          <p className="text-muted small mb-0">
            Cross-referenced vendor supply catalog, contract pricing, and historical transaction volume.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="alert alert-info border-info d-flex align-items-center gap-3 py-2 px-3 mb-4 rounded-3 small">
        <i className="bi bi-info-circle-fill fs-5 text-info flex-shrink-0"></i>
        <div>
          <strong>Verified ERP Telemetry:</strong> This relationship matrix is dynamically aggregated from actual material master records, active vendor registries, and verified purchase transactions. Standalone direct table manipulation for <code>materialvendors</code> does not have an active router mounted in the backend.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={relationshipData}
        loading={loading}
        keyField="id"
        searchPlaceholder="Search relationships by material, vendor, city..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <button
            className="btn btn-outline-secondary btn-action"
            onClick={() => setSelectedRelationship(row)}
            title="View Relationship Matrix"
          >
            <i className="bi bi-eye"></i> Details
          </button>
        )}
      />

      {/* DETAILS MODAL */}
      <Modal
        isOpen={!!selectedRelationship}
        onClose={() => setSelectedRelationship(null)}
        title="Material-Vendor Supply Matrix"
        icon="bi-diagram-3"
        size="md"
        footer={
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedRelationship(null)}
          >
            Close
          </button>
        }
      >
        {selectedRelationship && (
          <div className="document-meta-box">
            <div className="row g-3">
              <div className="col-6">
                <label className="text-muted small">Material Code</label>
                <div className="fw-bold font-monospace text-primary">
                  {selectedRelationship.MaterialCode}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Vendor Code</label>
                <div className="fw-bold font-monospace text-secondary">
                  {selectedRelationship.VendorCode}
                </div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Material Description</label>
                <div className="fw-bold">{selectedRelationship.MaterialName}</div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Supplier / Vendor</label>
                <div className="fw-bold">{selectedRelationship.VendorName}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Agreed Unit Price</label>
                <div className="fw-bold text-success fs-6">
                  ₹{Number(selectedRelationship.UnitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Relationship Status</label>
                <div><StatusBadge status={selectedRelationship.Status} /></div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Total Orders Linked</label>
                <div className="fw-bold">{selectedRelationship.TotalTransactions}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Total Volume Supplied</label>
                <div className="fw-bold">{selectedRelationship.TotalQuantityProcured} units</div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Last Transaction Date</label>
                <div className="text-secondary">{selectedRelationship.LastTransactionDate || "N/A"}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

