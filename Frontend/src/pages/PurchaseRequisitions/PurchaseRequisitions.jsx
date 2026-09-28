import { useState, useEffect, useCallback, useMemo } from "react";
import purchaseRequisitionsApi from "../../api/purchaseRequisitions";
import materialsApi from "../../api/materials";
import vendorsApi from "../../api/vendors";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function PurchaseRequisitions() {
  const { showToast } = useToast();

  const [requisitions, setRequisitions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    action: null, // "approve", "reject", "delete"
    id: null,
    prNumber: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const defaultRequiredDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  };

  const initialFormState = {
    MaterialID: "",
    VendorID: "",
    Quantity: "",
    UnitPrice: "",
    Priority: "Medium",
    RequestDate: new Date().toISOString().split("T")[0],
    RequiredDate: defaultRequiredDate(),
    Remarks: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prData, matData, vendData] = await Promise.all([
        purchaseRequisitionsApi.getAll(),
        materialsApi.getAll(),
        vendorsApi.getAll(),
      ]);

      setRequisitions(Array.isArray(prData) ? prData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to retrieve purchase requisitions.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps for fast access
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.MaterialID, m])), [materials]);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.VendorID, v])), [vendors]);

  const filterConfigs = [
    {
      key: "Status",
      label: "Statuses",
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Approved", value: "Approved" },
        { label: "Ordered", value: "Ordered" },
        { label: "Rejected", value: "Rejected" },
      ],
    },
    {
      key: "Priority",
      label: "Priorities",
      options: [
        { label: "Urgent", value: "Urgent" },
        { label: "High", value: "High" },
        { label: "Medium", value: "Medium" },
        { label: "Low", value: "Low" },
      ],
    },
  ];

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (pr) => {
    setFormData({
      MaterialID: pr.MaterialID,
      VendorID: pr.VendorID,
      Quantity: pr.Quantity,
      UnitPrice: pr.UnitPrice,
      Priority: pr.Priority,
      RequestDate: pr.RequestDate,
      RequiredDate: pr.RequiredDate,
      Remarks: pr.Remarks || "",
    });
    setFormModal({ open: true, isEdit: true, data: pr });
  };

  // Material selection auto-populates unit price
  const handleMaterialChange = (e) => {
    const matId = parseInt(e.target.value, 10);
    const selectedMat = materialMap.get(matId);
    setFormData((prev) => ({
      ...prev,
      MaterialID: matId || "",
      UnitPrice: selectedMat?.UnitPrice !== undefined ? selectedMat.UnitPrice : prev.UnitPrice,
    }));
  };

  const calculatedTotal = useMemo(() => {
    const qty = parseFloat(formData.Quantity) || 0;
    const price = parseFloat(formData.UnitPrice) || 0;
    return (qty * price).toFixed(2);
  }, [formData.Quantity, formData.UnitPrice]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.MaterialID || !formData.VendorID || !formData.Quantity || !formData.UnitPrice) {
      showToast("Please fill all required fields.", "warning");
      return;
    }

    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          MaterialID: parseInt(formData.MaterialID, 10),
          VendorID: parseInt(formData.VendorID, 10),
          Quantity: parseFloat(formData.Quantity),
          UnitPrice: parseFloat(formData.UnitPrice),
          Priority: formData.Priority,
          RequestDate: formData.RequestDate,
          RequiredDate: formData.RequiredDate,
          Remarks: formData.Remarks,
        };
        await purchaseRequisitionsApi.update(formModal.data.PRID, updatePayload);
        showToast(`Requisition "${formModal.data.PRNumber}" updated successfully.`, "success");
      } else {
        const createPayload = {
          MaterialID: parseInt(formData.MaterialID, 10),
          VendorID: parseInt(formData.VendorID, 10),
          Quantity: parseFloat(formData.Quantity),
          UnitPrice: parseFloat(formData.UnitPrice),
          Priority: formData.Priority,
          RequestDate: formData.RequestDate,
          RequiredDate: formData.RequiredDate,
          Remarks: formData.Remarks,
        };
        await purchaseRequisitionsApi.create(createPayload);
        showToast("Purchase Requisition created successfully.", "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to save requisition.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Actions: Approve, Reject, Delete
  const handleConfirmAction = async () => {
    const { action, id, prNumber } = confirmModal;
    if (!id || !action) return;

    setActionLoading(true);
    try {
      if (action === "approve") {
        await purchaseRequisitionsApi.approve(id);
        showToast(`Requisition ${prNumber} approved successfully.`, "success");
      } else if (action === "reject") {
        await purchaseRequisitionsApi.reject(id);
        showToast(`Requisition ${prNumber} rejected.`, "warning");
      } else if (action === "delete") {
        await purchaseRequisitionsApi.delete(id);
        showToast(`Requisition ${prNumber} deleted.`, "success");
      }
      setConfirmModal({ open: false, action: null, id: null, prNumber: "" });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || `Action "${action}" failed.`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "PRNumber",
      label: "PR Number",
      sortable: true,
      render: (val) => <span className="badge bg-primary-subtle text-primary font-monospace">{val}</span>,
    },
    {
      key: "MaterialID",
      label: "Material",
      sortable: true,
      render: (val) => {
        const mat = materialMap.get(val);
        return (
          <div>
            <div className="fw-semibold text-dark">{mat?.MaterialName || `Material #${val}`}</div>
            <div className="small text-muted font-monospace">{mat?.MaterialCode}</div>
          </div>
        );
      },
    },
    {
      key: "VendorID",
      label: "Vendor",
      sortable: true,
      render: (val) => {
        const vend = vendorMap.get(val);
        return <span className="small fw-medium text-secondary">{vend?.VendorName || `Vendor #${val}`}</span>;
      },
    },
    {
      key: "Quantity",
      label: "Quantity",
      sortable: true,
      align: "right",
      render: (val, row) => {
        const mat = materialMap.get(row.MaterialID);
        return (
          <span className="fw-semibold">
            {val} {mat?.UnitOfMeasure || "EA"}
          </span>
        );
      },
    },
    {
      key: "UnitPrice",
      label: "Unit Price",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="small text-secondary">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "TotalAmount",
      label: "Total Amount",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-bold text-dark">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "Priority",
      label: "Priority",
      sortable: true,
      render: (val) => <StatusBadge status={val} type="priority" />,
    },
    {
      key: "Status",
      label: "Status",
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "RequiredDate",
      label: "Required Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
  ];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Purchase Requisitions (PR)</h4>
          <p className="text-muted small mb-0">
            Internal procurement requests awaiting management authorization and conversion into Purchase Orders.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-file-earmark-plus"></i>
          <span>Create Requisition</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={requisitions}
        loading={loading}
        keyField="PRID"
        searchPlaceholder="Search by PR number, remarks, priority..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Requisition Document"
            >
              <i className="bi bi-eye"></i>
            </button>

            {row.Status === "Pending" && (
              <>
                <button
                  className="btn btn-outline-success btn-action"
                  onClick={() =>
                    setConfirmModal({
                      open: true,
                      action: "approve",
                      id: row.PRID,
                      prNumber: row.PRNumber,
                    })
                  }
                  title="Approve Requisition"
                >
                  <i className="bi bi-check-lg"></i>
                </button>
                <button
                  className="btn btn-outline-danger btn-action"
                  onClick={() =>
                    setConfirmModal({
                      open: true,
                      action: "reject",
                      id: row.PRID,
                      prNumber: row.PRNumber,
                    })
                  }
                  title="Reject Requisition"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
                <button
                  className="btn btn-outline-primary btn-action"
                  onClick={() => handleOpenEdit(row)}
                  title="Edit Requisition"
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
                  id: row.PRID,
                  prNumber: row.PRNumber,
                })
              }
              title="Delete Requisition"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW PR DOCUMENT MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Purchase Requisition Document"
        icon="bi-file-earmark-text"
        size="lg"
        footer={
          <div className="d-flex justify-content-between w-100 align-items-center">
            <span className="small text-muted">Document Status: <StatusBadge status={viewModal.data?.Status} /></span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setViewModal({ open: false, data: null })}
            >
              Close
            </button>
          </div>
        }
      >
        {viewModal.data && (
          <div className="erp-document">
            <div className="document-header">
              <div>
                <h4 className="fw-bold mb-0">PURCHASE REQUISITION</h4>
                <div className="text-muted small">SAP-Inspired Procurement ERP</div>
              </div>
              <div className="text-end">
                <div className="fw-bold fs-5 text-primary font-monospace">{viewModal.data.PRNumber}</div>
                <div className="small text-muted">Request Date: {viewModal.data.RequestDate}</div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="document-meta-box h-100">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-2">Item Specifications</h6>
                  <div><strong>Material:</strong> {materialMap.get(viewModal.data.MaterialID)?.MaterialName || `ID ${viewModal.data.MaterialID}`}</div>
                  <div><strong>Code:</strong> <span className="font-monospace text-primary">{materialMap.get(viewModal.data.MaterialID)?.MaterialCode}</span></div>
                  <div><strong>Category:</strong> {materialMap.get(viewModal.data.MaterialID)?.Category}</div>
                  <div><strong>Requested Qty:</strong> {viewModal.data.Quantity} {materialMap.get(viewModal.data.MaterialID)?.UnitOfMeasure || "EA"}</div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="document-meta-box h-100">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-2">Requisition Details</h6>
                  <div><strong>Vendor:</strong> {vendorMap.get(viewModal.data.VendorID)?.VendorName || `Vendor #${viewModal.data.VendorID}`}</div>
                  <div><strong>Priority:</strong> <StatusBadge status={viewModal.data.Priority} type="priority" /></div>
                  <div><strong>Required Date:</strong> {viewModal.data.RequiredDate}</div>
                  <div><strong>Created By User ID:</strong> #{viewModal.data.UserID}</div>
                </div>
              </div>
            </div>

            <table className="table table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Description</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Unit Price (₹)</th>
                  <th className="text-end">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{materialMap.get(viewModal.data.MaterialID)?.MaterialName}</td>
                  <td className="text-end">{viewModal.data.Quantity}</td>
                  <td className="text-end">₹{Number(viewModal.data.UnitPrice || 0).toFixed(2)}</td>
                  <td className="text-end fw-bold">₹{Number(viewModal.data.TotalAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="document-total-box">
              Grand Total: ₹{Number(viewModal.data.TotalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>

            {viewModal.data.Remarks && (
              <div className="mt-3 p-2 bg-light rounded small text-secondary">
                <strong>Remarks / Notes:</strong> {viewModal.data.Remarks}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT PR MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Edit Purchase Requisition" : "Create Purchase Requisition"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-file-earmark-plus"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Select Material <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm"
                value={formData.MaterialID}
                onChange={handleMaterialChange}
                required
              >
                <option value="">-- Choose Material --</option>
                {materials.map((m) => (
                  <option key={m.MaterialID} value={m.MaterialID}>
                    {m.MaterialCode} - {m.MaterialName} (₹{m.UnitPrice})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Select Vendor <span className="text-danger">*</span>
              </label>
              <select
                className="form-select form-select-sm"
                value={formData.VendorID}
                onChange={(e) => setFormData({ ...formData, VendorID: parseInt(e.target.value, 10) || "" })}
                required
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.VendorID} value={v.VendorID}>
                    {v.VendorCode} - {v.VendorName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">
                Quantity <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control form-control-sm"
                placeholder="e.g. 50"
                value={formData.Quantity}
                onChange={(e) => setFormData({ ...formData, Quantity: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">
                Unit Price (₹) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control form-control-sm"
                placeholder="0.00"
                value={formData.UnitPrice}
                onChange={(e) => setFormData({ ...formData, UnitPrice: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Computed Total (₹)</label>
              <input
                type="text"
                className="form-control form-control-sm bg-light fw-bold"
                value={`₹${calculatedTotal}`}
                readOnly
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Priority</label>
              <select
                className="form-select form-select-sm"
                value={formData.Priority}
                onChange={(e) => setFormData({ ...formData, Priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Request Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={formData.RequestDate}
                onChange={(e) => setFormData({ ...formData, RequestDate: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Required By Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={formData.RequiredDate}
                onChange={(e) => setFormData({ ...formData, RequiredDate: e.target.value })}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Business Justification / Remarks</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Specify reason for procurement request..."
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
            <button type="submit" className="btn btn-erp-primary btn-sm" disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Processing...
                </>
              ) : formModal.isEdit ? (
                "Update Requisition"
              ) : (
                "Submit Requisition"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DIALOG (Approve, Reject, Delete) */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: null, id: null, prNumber: "" })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.action === "approve"
            ? "Approve Purchase Requisition"
            : confirmModal.action === "reject"
            ? "Reject Purchase Requisition"
            : "Delete Purchase Requisition"
        }
        message={
          confirmModal.action === "approve"
            ? `Are you sure you want to approve ${confirmModal.prNumber}? It can subsequently be converted into an official Purchase Order.`
            : confirmModal.action === "reject"
            ? `Are you sure you want to reject requisition ${confirmModal.prNumber}?`
            : `Are you sure you want to delete requisition ${confirmModal.prNumber}? This action cannot be reversed.`
        }
        confirmText={
          confirmModal.action === "approve"
            ? "Approve PR"
            : confirmModal.action === "reject"
            ? "Reject PR"
            : "Delete PR"
        }
        variant={
          confirmModal.action === "approve"
            ? "primary"
            : confirmModal.action === "reject"
            ? "warning"
            : "danger"
        }
        loading={actionLoading}
      />
    </div>
  );
}

