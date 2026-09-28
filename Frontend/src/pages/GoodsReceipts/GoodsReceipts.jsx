import { useState, useEffect, useCallback, useMemo } from "react";
import goodsReceiptsApi from "../../api/goodsReceipts";
import purchaseOrdersApi from "../../api/purchaseOrders";
import purchaseRequisitionsApi from "../../api/purchaseRequisitions";
import vendorsApi from "../../api/vendors";
import materialsApi from "../../api/materials";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function GoodsReceipts() {
  const { showToast } = useToast();

  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, grNumber: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialFormState = {
    POID: "",
    QuantityReceived: "",
    QualityStatus: "Accepted",
    WarehouseLocation: "Warehouse-A",
    Status: "Completed",
    Remarks: "Goods received in good condition.",
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [grData, poData, prData, vendData, matData] = await Promise.all([
        goodsReceiptsApi.getAll(),
        purchaseOrdersApi.getAll(),
        purchaseRequisitionsApi.getAll(),
        vendorsApi.getAll(),
        materialsApi.getAll(),
      ]);

      setGoodsReceipts(Array.isArray(grData) ? grData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setRequisitions(Array.isArray(prData) ? prData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load Goods Receipts.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const poMap = useMemo(() => new Map(purchaseOrders.map((p) => [p.POID, p])), [purchaseOrders]);
  const prMap = useMemo(() => new Map(requisitions.map((r) => [r.PRID, r])), [requisitions]);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.VendorID, v])), [vendors]);
  const matMap = useMemo(() => new Map(materials.map((m) => [m.MaterialID, m])), [materials]);

  // Open POs that do not already have a GR
  const availableOpenPOs = useMemo(() => {
    const usedPoIds = new Set(goodsReceipts.map((gr) => gr.POID));
    return purchaseOrders.filter((po) => po.Status === "Open" && !usedPoIds.has(po.POID));
  }, [purchaseOrders, goodsReceipts]);

  // Selected PO details for validation in modal
  const selectedPO = useMemo(() => {
    if (!formData.POID) return null;
    return poMap.get(parseInt(formData.POID, 10));
  }, [formData.POID, poMap]);

  const selectedPR = useMemo(() => {
    if (!selectedPO) return null;
    return prMap.get(selectedPO.PRID);
  }, [selectedPO, prMap]);

  const selectedMaterial = useMemo(() => {
    if (!selectedPR) return null;
    return matMap.get(selectedPR.MaterialID);
  }, [selectedPR, matMap]);

  const filterConfigs = [
    {
      key: "QualityStatus",
      label: "Quality Statuses",
      options: [
        { label: "Accepted", value: "Accepted" },
        { label: "Partially Accepted", value: "Partially Accepted" },
        { label: "Rejected", value: "Rejected" },
      ],
    },
    {
      key: "WarehouseLocation",
      label: "Warehouses",
      options: [
        { label: "Warehouse-A", value: "Warehouse-A" },
        { label: "Warehouse-B", value: "Warehouse-B" },
        { label: "Warehouse-C", value: "Warehouse-C" },
      ],
    },
    {
      key: "Status",
      label: "Receipt Statuses",
      options: [
        { label: "Completed", value: "Completed" },
        { label: "Pending Inspection", value: "Pending Inspection" },
      ],
    },
  ];

  const handleOpenCreate = () => {
    if (availableOpenPOs.length === 0) {
      showToast("No Open Purchase Orders currently available for goods receipting.", "warning");
    }
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  const handlePoChange = (e) => {
    const poId = e.target.value;
    const po = poMap.get(parseInt(poId, 10));
    const pr = po ? prMap.get(po.PRID) : null;
    setFormData((prev) => ({
      ...prev,
      POID: poId,
      QuantityReceived: pr ? pr.Quantity : "",
    }));
  };

  const handleOpenEdit = (gr) => {
    setFormData({
      POID: gr.POID,
      QuantityReceived: gr.QuantityReceived,
      QualityStatus: gr.QualityStatus || "Accepted",
      WarehouseLocation: gr.WarehouseLocation || "Warehouse-A",
      Status: gr.Status || "Completed",
      Remarks: gr.Remarks || "",
    });
    setFormModal({ open: true, isEdit: true, data: gr });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          QualityStatus: formData.QualityStatus,
          WarehouseLocation: formData.WarehouseLocation,
          Status: formData.Status,
          Remarks: formData.Remarks,
        };
        await goodsReceiptsApi.update(formModal.data.GRID, updatePayload);
        showToast(`Goods Receipt "${formModal.data.GRNumber}" updated successfully.`, "success");
      } else {
        const qtyReceived = parseFloat(formData.QuantityReceived);
        if (selectedPR && qtyReceived > parseFloat(selectedPR.Quantity)) {
          showToast(
            `Quantity received (${qtyReceived}) cannot exceed ordered quantity (${selectedPR.Quantity}).`,
            "warning"
          );
          setActionLoading(false);
          return;
        }

        const createPayload = {
          POID: parseInt(formData.POID, 10),
          QuantityReceived: qtyReceived,
          QualityStatus: formData.QualityStatus,
          WarehouseLocation: formData.WarehouseLocation,
          Status: formData.Status,
          Remarks: formData.Remarks,
        };
        await goodsReceiptsApi.create(createPayload);
        showToast("Goods Receipt created, inventory stock incremented, and PO completed.", "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to process Goods Receipt.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setActionLoading(true);
    try {
      await goodsReceiptsApi.delete(deleteDialog.id);
      showToast(`Goods Receipt "${deleteDialog.grNumber}" deleted.`, "success");
      setDeleteDialog({ open: false, id: null, grNumber: "" });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to delete Goods Receipt.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "GRNumber",
      label: "GR Number",
      sortable: true,
      render: (val) => <span className="badge bg-purple-subtle text-purple font-monospace fw-bold" style={{ color: "#6f42c1", backgroundColor: "#f5f3ff" }}>{val}</span>,
    },
    {
      key: "POID",
      label: "Purchase Order",
      sortable: true,
      render: (val) => {
        const po = poMap.get(val);
        const pr = po ? prMap.get(po.PRID) : null;
        const mat = pr ? matMap.get(pr.MaterialID) : null;
        return (
          <div>
            <span className="font-monospace text-dark fw-semibold">{po?.PONumber || `PO #${val}`}</span>
            {mat && <div className="small text-muted">{mat.MaterialName}</div>}
          </div>
        );
      },
    },
    {
      key: "VendorID",
      label: "Supplier",
      sortable: true,
      render: (val) => {
        const vend = vendorMap.get(val);
        return <span className="small text-secondary">{vend?.VendorName || `Vendor #${val}`}</span>;
      },
    },
    {
      key: "ReceiptDate",
      label: "Receipt Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
    {
      key: "QuantityReceived",
      label: "Qty Received",
      sortable: true,
      align: "right",
      render: (val, row) => {
        const po = poMap.get(row.POID);
        const pr = po ? prMap.get(po.PRID) : null;
        const mat = pr ? matMap.get(pr.MaterialID) : null;
        return (
          <span className="fw-bold text-dark">
            {val} {mat?.UnitOfMeasure || "EA"}
          </span>
        );
      },
    },
    {
      key: "QualityStatus",
      label: "Quality Inspection",
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "WarehouseLocation",
      label: "Warehouse Location",
      sortable: true,
      render: (val) => <span className="badge bg-light text-dark border">{val || "Warehouse-A"}</span>,
    },
    {
      key: "Status",
      label: "Status",
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Goods Receipts Note (GRN)</h4>
          <p className="text-muted small mb-0">
            Physical receipt of supplier shipments, quality inspection verification, and stock inventory ledger posting.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-box-seam-fill"></i>
          <span>Process Goods Receipt</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={goodsReceipts}
        loading={loading}
        keyField="GRID"
        searchPlaceholder="Search by GR number, quality, warehouse..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Goods Receipt Slip"
            >
              <i className="bi bi-file-earmark-text"></i>
            </button>
            <button
              className="btn btn-outline-primary btn-action"
              onClick={() => handleOpenEdit(row)}
              title="Edit Quality/Location"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setDeleteDialog({
                  open: true,
                  id: row.GRID,
                  grNumber: row.GRNumber,
                })
              }
              title="Delete GR"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW GR SLIP MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Goods Receipt Inspection Slip"
        icon="bi-truck"
        size="lg"
        footer={
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewModal({ open: false, data: null })}
          >
            Close
          </button>
        }
      >
        {viewModal.data && (() => {
          const po = poMap.get(viewModal.data.POID);
          const pr = po ? prMap.get(po.PRID) : null;
          const mat = pr ? matMap.get(pr.MaterialID) : null;
          const vend = vendorMap.get(viewModal.data.VendorID);

          return (
            <div className="erp-document">
              <div className="document-header">
                <div>
                  <h3 className="fw-bold mb-0 text-dark">GOODS RECEIPT NOTE</h3>
                  <div className="text-muted small">Warehouse Quality & Receiving Inspection</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold fs-4 text-purple font-monospace" style={{ color: "#6f42c1" }}>
                    {viewModal.data.GRNumber}
                  </div>
                  <div className="small text-muted">Receipt Date: {viewModal.data.ReceiptDate}</div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Shipment Source</h6>
                    <div><strong>Supplier:</strong> {vend?.VendorName}</div>
                    <div><strong>Vendor Code:</strong> {vend?.VendorCode}</div>
                    <div><strong>Purchase Order:</strong> <span className="font-monospace text-primary">{po?.PONumber}</span></div>
                    <div><strong>Received By Officer ID:</strong> #{viewModal.data.ReceivedBy}</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Storage & Quality Verification</h6>
                    <div><strong>Warehouse Location:</strong> {viewModal.data.WarehouseLocation}</div>
                    <div><strong>Quality Status:</strong> <StatusBadge status={viewModal.data.QualityStatus} /></div>
                    <div><strong>Receipt Status:</strong> <StatusBadge status={viewModal.data.Status} /></div>
                  </div>
                </div>
              </div>

              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Material Received</th>
                    <th>Code</th>
                    <th className="text-end">Ordered Qty</th>
                    <th className="text-end">Received Qty</th>
                    <th className="text-center">Quality Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="fw-semibold">{mat?.MaterialName || "Goods Item"}</div>
                      <div className="small text-muted">{mat?.Category}</div>
                    </td>
                    <td className="font-monospace text-muted">{mat?.MaterialCode}</td>
                    <td className="text-end">{pr?.Quantity || "-"} {mat?.UnitOfMeasure}</td>
                    <td className="text-end fw-bold text-success fs-6">
                      {viewModal.data.QuantityReceived} {mat?.UnitOfMeasure}
                    </td>
                    <td className="text-center">
                      <StatusBadge status={viewModal.data.QualityStatus} />
                    </td>
                  </tr>
                </tbody>
              </table>

              {viewModal.data.Remarks && (
                <div className="mt-3 p-2 bg-light rounded small text-secondary">
                  <strong>Inspector Remarks:</strong> {viewModal.data.Remarks}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* CREATE / EDIT GR MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Update Goods Receipt" : "Record Goods Receipt against Purchase Order"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-truck"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit ? (
              <div className="col-12">
                <label className="form-label small fw-semibold text-secondary">
                  Select Open Purchase Order <span className="text-danger">*</span>
                </label>
                {availableOpenPOs.length > 0 ? (
                  <select
                    className="form-select form-select-sm"
                    value={formData.POID}
                    onChange={handlePoChange}
                    required
                  >
                    <option value="">-- Choose Open Purchase Order --</option>
                    {availableOpenPOs.map((po) => {
                      const pr = prMap.get(po.PRID);
                      const mat = pr ? matMap.get(pr.MaterialID) : null;
                      const vend = vendorMap.get(po.VendorID);
                      return (
                        <option key={po.POID} value={po.POID}>
                          {po.PONumber}: {mat?.MaterialName} ({pr?.Quantity} {mat?.UnitOfMeasure}) from {vend?.VendorName}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="alert alert-warning py-2 small mb-0">
                    No Open Purchase Orders available for receipt. Create a Purchase Order from an Approved PR first.
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12">
                <div className="document-meta-box py-2">
                  <div className="small text-muted">Goods Receipt: <strong>{formModal.data?.GRNumber}</strong></div>
                  <div className="small text-muted">Receipt Date: {formModal.data?.ReceiptDate}</div>
                  <div className="small text-muted">Quantity Received: {formModal.data?.QuantityReceived}</div>
                </div>
              </div>
            )}

            {selectedPR && !formModal.isEdit && (
              <div className="col-12">
                <div className="p-2 bg-light border rounded small">
                  <strong>Target Material:</strong> {selectedMaterial?.MaterialName} |{" "}
                  <strong>Ordered Qty:</strong> {selectedPR.Quantity} {selectedMaterial?.UnitOfMeasure} |{" "}
                  <strong>Supplier:</strong> {vendorMap.get(selectedPO.VendorID)?.VendorName}
                </div>
              </div>
            )}

            {!formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">
                  Quantity Received <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPR ? parseFloat(selectedPR.Quantity) : undefined}
                  className="form-control form-control-sm"
                  placeholder="e.g. 50"
                  value={formData.QuantityReceived}
                  onChange={(e) => setFormData({ ...formData, QuantityReceived: e.target.value })}
                  required
                />
                {selectedPR && (
                  <div className="form-text small">
                    Maximum receivable quantity is {selectedPR.Quantity} {selectedMaterial?.UnitOfMeasure}.
                  </div>
                )}
              </div>
            )}

            <div className={formModal.isEdit ? "col-md-6" : "col-md-6"}>
              <label className="form-label small fw-semibold text-secondary">Quality Inspection Status</label>
              <select
                className="form-select form-select-sm"
                value={formData.QualityStatus}
                onChange={(e) => setFormData({ ...formData, QualityStatus: e.target.value })}
              >
                <option value="Accepted">Accepted (Passed Inspection)</option>
                <option value="Partially Accepted">Partially Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Warehouse Location</label>
              <select
                className="form-select form-select-sm"
                value={formData.WarehouseLocation}
                onChange={(e) => setFormData({ ...formData, WarehouseLocation: e.target.value })}
              >
                <option value="Warehouse-A">Warehouse-A</option>
                <option value="Warehouse-B">Warehouse-B</option>
                <option value="Warehouse-C">Warehouse-C</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Receipt Status</label>
              <select
                className="form-select form-select-sm"
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
              >
                <option value="Completed">Completed</option>
                <option value="Pending Inspection">Pending Inspection</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Inspection Notes / Remarks</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Details of physical packaging, batch numbers, inspection findings..."
                value={formData.Remarks}
                onChange={(e) => setFormData({ ...formData, Remarks: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setFormModal({ open: false, isEdit: false, data: null })}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-erp-primary btn-sm"
              disabled={actionLoading || (!formModal.isEdit && availableOpenPOs.length === 0)}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Processing...
                </>
              ) : formModal.isEdit ? (
                "Update Goods Receipt"
              ) : (
                "Post Goods Receipt (GRN)"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, grNumber: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Goods Receipt"
        message={`Are you sure you want to delete Goods Receipt "${deleteDialog.grNumber}"? This action cannot be reversed.`}
        confirmText="Delete GR"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

