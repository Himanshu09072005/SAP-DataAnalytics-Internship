import { useState, useEffect, useCallback, useMemo } from "react";
import purchaseOrdersApi from "../../api/purchaseOrders";
import purchaseRequisitionsApi from "../../api/purchaseRequisitions";
import vendorsApi from "../../api/vendors";
import materialsApi from "../../api/materials";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function PurchaseOrders() {
  const { showToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    action: null, // "complete", "cancel", "delete"
    id: null,
    poNumber: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const defaultDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  };

  const initialFormState = {
    PRID: "",
    ExpectedDeliveryDate: defaultDeliveryDate(),
    PaymentTerms: "Net 30",
    Remarks: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [poData, prData, vendData, matData] = await Promise.all([
        purchaseOrdersApi.getAll(),
        purchaseRequisitionsApi.getAll(),
        vendorsApi.getAll(),
        materialsApi.getAll(),
      ]);

      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setRequisitions(Array.isArray(prData) ? prData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load Purchase Orders.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.VendorID, v])), [vendors]);
  const prMap = useMemo(() => new Map(requisitions.map((p) => [p.PRID, p])), [requisitions]);
  const matMap = useMemo(() => new Map(materials.map((m) => [m.MaterialID, m])), [materials]);

  // Approved PRs that don't already have an active PO
  const availableApprovedPrs = useMemo(() => {
    const usedPrIds = new Set(purchaseOrders.map((po) => po.PRID));
    return requisitions.filter((pr) => pr.Status === "Approved" && !usedPrIds.has(pr.PRID));
  }, [requisitions, purchaseOrders]);

  const filterConfigs = [
    {
      key: "Status",
      label: "Statuses",
      options: [
        { label: "Open", value: "Open" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" },
      ],
    },
  ];

  const handleOpenCreate = () => {
    if (availableApprovedPrs.length === 0) {
      showToast(
        "No Approved Purchase Requisitions available. Please approve a pending PR first.",
        "warning"
      );
    }
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (po) => {
    setFormData({
      PRID: po.PRID,
      ExpectedDeliveryDate: po.ExpectedDeliveryDate,
      PaymentTerms: po.PaymentTerms || "Net 30",
      Remarks: po.Remarks || "",
    });
    setFormModal({ open: true, isEdit: true, data: po });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          ExpectedDeliveryDate: formData.ExpectedDeliveryDate,
          PaymentTerms: formData.PaymentTerms,
          Remarks: formData.Remarks,
        };
        await purchaseOrdersApi.update(formModal.data.POID, updatePayload);
        showToast(`Purchase Order "${formModal.data.PONumber}" updated successfully.`, "success");
      } else {
        if (!formData.PRID) {
          showToast("Please select an approved Purchase Requisition.", "warning");
          setActionLoading(false);
          return;
        }

        const createPayload = {
          PRID: parseInt(formData.PRID, 10),
          ExpectedDeliveryDate: formData.ExpectedDeliveryDate,
          PaymentTerms: formData.PaymentTerms,
          Remarks: formData.Remarks,
        };
        await purchaseOrdersApi.create(createPayload);
        showToast("Purchase Order generated and PR status updated to Ordered.", "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to process Purchase Order.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    const { action, id, poNumber } = confirmModal;
    if (!id || !action) return;

    setActionLoading(true);
    try {
      if (action === "complete") {
        await purchaseOrdersApi.complete(id);
        showToast(`Purchase Order ${poNumber} marked as Completed.`, "success");
      } else if (action === "cancel") {
        await purchaseOrdersApi.cancel(id);
        showToast(`Purchase Order ${poNumber} cancelled.`, "warning");
      } else if (action === "delete") {
        await purchaseOrdersApi.delete(id);
        showToast(`Purchase Order ${poNumber} deleted.`, "success");
      }
      setConfirmModal({ open: false, action: null, id: null, poNumber: "" });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || `Action "${action}" failed.`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "PONumber",
      label: "PO Number",
      sortable: true,
      render: (val) => <span className="badge bg-secondary-subtle text-dark font-monospace fw-bold">{val}</span>,
    },
    {
      key: "PRID",
      label: "Linked PR",
      sortable: true,
      render: (val) => {
        const pr = prMap.get(val);
        const mat = pr ? matMap.get(pr.MaterialID) : null;
        return (
          <div>
            <span className="font-monospace text-primary">{pr?.PRNumber || `PR #${val}`}</span>
            {mat && <div className="small text-muted">{mat.MaterialName}</div>}
          </div>
        );
      },
    },
    {
      key: "VendorID",
      label: "Supplier / Vendor",
      sortable: true,
      render: (val) => {
        const vend = vendorMap.get(val);
        return (
          <div>
            <div className="fw-semibold text-dark">{vend?.VendorName || `Vendor #${val}`}</div>
            <div className="small text-muted">{vend?.VendorCode}</div>
          </div>
        );
      },
    },
    {
      key: "OrderDate",
      label: "Order Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
    {
      key: "ExpectedDeliveryDate",
      label: "Expected Delivery",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
    {
      key: "TotalAmount",
      label: "Order Value",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-bold text-dark">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "PaymentTerms",
      label: "Payment Terms",
      sortable: true,
      render: (val) => <span className="badge bg-light text-dark border">{val || "Net 30"}</span>,
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
          <h4 className="fw-bold mb-1">Purchase Orders (PO)</h4>
          <p className="text-muted small mb-0">
            Binding commercial orders issued to suppliers, generated directly from authorized requisitions.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-cart-plus"></i>
          <span>Generate Purchase Order</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={purchaseOrders}
        loading={loading}
        keyField="POID"
        searchPlaceholder="Search by PO number, supplier, terms..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View PO Document"
            >
              <i className="bi bi-file-earmark-ruled"></i>
            </button>

            {row.Status === "Open" && (
              <>
                <button
                  className="btn btn-outline-success btn-action"
                  onClick={() =>
                    setConfirmModal({
                      open: true,
                      action: "complete",
                      id: row.POID,
                      poNumber: row.PONumber,
                    })
                  }
                  title="Mark as Completed"
                >
                  <i className="bi bi-check2-all"></i>
                </button>
                <button
                  className="btn btn-outline-warning btn-action"
                  onClick={() =>
                    setConfirmModal({
                      open: true,
                      action: "cancel",
                      id: row.POID,
                      poNumber: row.PONumber,
                    })
                  }
                  title="Cancel Order"
                >
                  <i className="bi bi-slash-circle"></i>
                </button>
                <button
                  className="btn btn-outline-primary btn-action"
                  onClick={() => handleOpenEdit(row)}
                  title="Edit PO"
                >
                  <i className="bi bi-pencil"></i>
                </button>
              </>
            )}

            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setConfirmModal({
                  open: true,
                  action: "delete",
                  id: row.POID,
                  poNumber: row.PONumber,
                })
              }
              title="Delete PO"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW PO DOCUMENT MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Official Purchase Order Document"
        icon="bi-cart-check"
        size="lg"
        footer={
          <div className="d-flex justify-content-between w-100 align-items-center">
            <span className="small text-muted">Order Status: <StatusBadge status={viewModal.data?.Status} /></span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setViewModal({ open: false, data: null })}
            >
              Close
            </button>
          </div>
        }
      >
        {viewModal.data && (() => {
          const linkedPr = prMap.get(viewModal.data.PRID);
          const linkedMat = linkedPr ? matMap.get(linkedPr.MaterialID) : null;
          const linkedVend = vendorMap.get(viewModal.data.VendorID);

          return (
            <div className="erp-document">
              <div className="document-header">
                <div>
                  <h3 className="fw-bold mb-0 text-dark">PURCHASE ORDER</h3>
                  <div className="text-muted small">SAP-Inspired Enterprise Procurement</div>
                  <div className="small text-secondary mt-1">Official Document • ERP Generated</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold fs-4 text-primary font-monospace">{viewModal.data.PONumber}</div>
                  <div className="small text-muted">PO Date: <strong>{viewModal.data.OrderDate}</strong></div>
                  <div className="small text-muted">Ref PR: <span className="font-monospace">{linkedPr?.PRNumber || `PR #${viewModal.data.PRID}`}</span></div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Vendor / Supplier</h6>
                    <div className="fw-bold fs-6">{linkedVend?.VendorName || "Unknown Vendor"}</div>
                    <div className="text-muted small">Code: {linkedVend?.VendorCode}</div>
                    <div className="text-muted small">{linkedVend?.Address}</div>
                    <div className="text-muted small">{linkedVend?.City}, {linkedVend?.State} {linkedVend?.PostalCode}</div>
                    <div className="text-muted small font-monospace mt-1">GST: {linkedVend?.GSTNumber || "Unregistered"}</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Delivery & Terms</h6>
                    <div><strong>Expected Delivery:</strong> {viewModal.data.ExpectedDeliveryDate}</div>
                    <div><strong>Payment Terms:</strong> {viewModal.data.PaymentTerms || "Net 30 Days"}</div>
                    <div><strong>Issuing Officer:</strong> User ID #{viewModal.data.UserID}</div>
                    <div><strong>Order Status:</strong> <StatusBadge status={viewModal.data.Status} /></div>
                  </div>
                </div>
              </div>

              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item Description</th>
                    <th className="text-center">Code</th>
                    <th className="text-end">Quantity</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="fw-semibold">{linkedMat?.MaterialName || "General Goods"}</div>
                      <div className="small text-muted">{linkedMat?.Category}</div>
                    </td>
                    <td className="text-center font-monospace text-muted">{linkedMat?.MaterialCode || "-"}</td>
                    <td className="text-end">{linkedPr?.Quantity || 1} {linkedMat?.UnitOfMeasure || "EA"}</td>
                    <td className="text-end">₹{Number(linkedPr?.UnitPrice || 0).toFixed(2)}</td>
                    <td className="text-end fw-bold">₹{Number(viewModal.data.TotalAmount || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="document-total-box">
                Total Order Commitment: ₹{Number(viewModal.data.TotalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>

              {viewModal.data.Remarks && (
                <div className="mt-3 p-2 bg-light rounded small text-secondary">
                  <strong>Notes / Delivery Instructions:</strong> {viewModal.data.Remarks}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* CREATE / EDIT PO MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Edit Purchase Order" : "Generate Purchase Order from Requisition"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-cart-plus"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit ? (
              <div className="col-12">
                <label className="form-label small fw-semibold text-secondary">
                  Select Approved Purchase Requisition <span className="text-danger">*</span>
                </label>
                {availableApprovedPrs.length > 0 ? (
                  <select
                    className="form-select form-select-sm"
                    value={formData.PRID}
                    onChange={(e) => setFormData({ ...formData, PRID: e.target.value })}
                    required
                  >
                    <option value="">-- Select Approved Requisition --</option>
                    {availableApprovedPrs.map((pr) => {
                      const mat = matMap.get(pr.MaterialID);
                      const vend = vendorMap.get(pr.VendorID);
                      return (
                        <option key={pr.PRID} value={pr.PRID}>
                          {pr.PRNumber}: {mat?.MaterialName} ({pr.Quantity} {mat?.UnitOfMeasure}) from {vend?.VendorName} - ₹{Number(pr.TotalAmount).toLocaleString()}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="alert alert-warning py-2 small mb-0">
                    No approved requisitions ready for PO conversion. Approve a requisition in the Purchase Requisitions module first.
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12">
                <div className="document-meta-box py-2">
                  <div className="small text-muted">Purchase Order: <strong>{formModal.data?.PONumber}</strong></div>
                  <div className="small text-muted">Order Date: {formModal.data?.OrderDate}</div>
                  <div className="small text-muted">Order Value: ₹{Number(formModal.data?.TotalAmount || 0).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Expected Delivery Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={formData.ExpectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, ExpectedDeliveryDate: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Payment Terms</label>
              <select
                className="form-select form-select-sm"
                value={formData.PaymentTerms}
                onChange={(e) => setFormData({ ...formData, PaymentTerms: e.target.value })}
              >
                <option value="Immediate">Immediate / Advance</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 45">Net 45 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Remarks & Special Terms</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Add delivery terms, packaging instructions, etc."
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
              disabled={actionLoading || (!formModal.isEdit && availableApprovedPrs.length === 0)}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Processing...
                </>
              ) : formModal.isEdit ? (
                "Update PO"
              ) : (
                "Issue Purchase Order"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: null, id: null, poNumber: "" })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.action === "complete"
            ? "Mark Purchase Order as Completed"
            : confirmModal.action === "cancel"
            ? "Cancel Purchase Order"
            : "Delete Purchase Order"
        }
        message={
          confirmModal.action === "complete"
            ? `Are you sure you want to mark ${confirmModal.poNumber} as Completed?`
            : confirmModal.action === "cancel"
            ? `Are you sure you want to cancel order ${confirmModal.poNumber}?`
            : `Are you sure you want to delete order ${confirmModal.poNumber}? This cannot be undone.`
        }
        confirmText={
          confirmModal.action === "complete"
            ? "Complete PO"
            : confirmModal.action === "cancel"
            ? "Cancel PO"
            : "Delete PO"
        }
        variant={
          confirmModal.action === "complete"
            ? "primary"
            : confirmModal.action === "cancel"
            ? "warning"
            : "danger"
        }
        loading={actionLoading}
      />
    </div>
  );
}

