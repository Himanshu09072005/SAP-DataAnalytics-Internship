import { useState, useEffect, useCallback, useMemo } from "react";
import invoicesApi from "../../api/invoices";
import goodsReceiptsApi from "../../api/goodsReceipts";
import purchaseOrdersApi from "../../api/purchaseOrders";
import vendorsApi from "../../api/vendors";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function Invoices() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, invNumber: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const initialFormState = {
    GRID: "",
    InvoiceAmount: "",
    GSTAmount: "",
    PaymentStatus: "Pending",
    Remarks: "Vendor tax invoice submitted.",
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, grData, poData, vendData] = await Promise.all([
        invoicesApi.getAll(),
        goodsReceiptsApi.getAll(),
        purchaseOrdersApi.getAll(),
        vendorsApi.getAll(),
      ]);

      setInvoices(Array.isArray(invData) ? invData : []);
      setGoodsReceipts(Array.isArray(grData) ? grData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load invoices.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const grMap = useMemo(() => new Map(goodsReceipts.map((g) => [g.GRID, g])), [goodsReceipts]);
  const poMap = useMemo(() => new Map(purchaseOrders.map((p) => [p.POID, p])), [purchaseOrders]);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.VendorID, v])), [vendors]);

  // Completed GRs that do not already have an invoice
  const availableCompletedGRs = useMemo(() => {
    const usedGrIds = new Set(invoices.map((inv) => inv.GRID));
    return goodsReceipts.filter((gr) => gr.Status === "Completed" && !usedGrIds.has(gr.GRID));
  }, [goodsReceipts, invoices]);

  const filterConfigs = [
    {
      key: "PaymentStatus",
      label: "Payment Statuses",
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Partially Paid", value: "Partially Paid" },
        { label: "Paid", value: "Paid" },
      ],
    },
  ];

  const handleOpenCreate = () => {
    if (availableCompletedGRs.length === 0) {
      showToast("No uninvoiced Completed Goods Receipts found. Receive goods first.", "warning");
    }
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  // Auto-calculate GST when base invoice amount changes
  const handleAmountChange = (val) => {
    const baseAmt = parseFloat(val) || 0;
    const gstAmt = (baseAmt * 0.18).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      InvoiceAmount: val,
      GSTAmount: gstAmt,
    }));
  };

  const handleOpenEdit = (inv) => {
    setFormData({
      GRID: inv.GRID,
      InvoiceAmount: inv.InvoiceAmount,
      GSTAmount: inv.GSTAmount,
      PaymentStatus: inv.PaymentStatus || "Pending",
      Remarks: inv.Remarks || "",
    });
    setFormModal({ open: true, isEdit: true, data: inv });
  };

  const calculatedTotal = useMemo(() => {
    const base = parseFloat(formData.InvoiceAmount) || 0;
    const gst = parseFloat(formData.GSTAmount) || 0;
    return (base + gst).toFixed(2);
  }, [formData.InvoiceAmount, formData.GSTAmount]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          InvoiceAmount: parseFloat(formData.InvoiceAmount),
          GSTAmount: parseFloat(formData.GSTAmount),
          PaymentStatus: formData.PaymentStatus,
          Remarks: formData.Remarks,
        };
        await invoicesApi.update(formModal.data.InvoiceID, updatePayload);
        showToast(`Invoice "${formModal.data.InvoiceNumber}" updated successfully.`, "success");
      } else {
        if (!formData.GRID) {
          showToast("Please select a Completed Goods Receipt.", "warning");
          setActionLoading(false);
          return;
        }

        const createPayload = {
          GRID: parseInt(formData.GRID, 10),
          InvoiceAmount: parseFloat(formData.InvoiceAmount),
          GSTAmount: parseFloat(formData.GSTAmount),
          Remarks: formData.Remarks,
        };
        await invoicesApi.create(createPayload);
        showToast("Vendor invoice created with verified GST calculation.", "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to process invoice.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setActionLoading(true);
    try {
      await invoicesApi.delete(deleteDialog.id);
      showToast(`Invoice "${deleteDialog.invNumber}" deleted.`, "success");
      setDeleteDialog({ open: false, id: null, invNumber: "" });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to delete invoice.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "InvoiceNumber",
      label: "Invoice Number",
      sortable: true,
      render: (val) => <span className="badge bg-secondary-subtle text-dark font-monospace fw-bold">{val}</span>,
    },
    {
      key: "GRID",
      label: "Linked GR & PO",
      sortable: true,
      render: (val, row) => {
        const gr = grMap.get(val);
        const po = poMap.get(row.POID);
        return (
          <div>
            <span className="font-monospace text-primary small">{gr?.GRNumber || `GR #${val}`}</span>
            <div className="small text-muted font-monospace">{po?.PONumber || `PO #${row.POID}`}</div>
          </div>
        );
      },
    },
    {
      key: "VendorID",
      label: "Supplier / Payee",
      sortable: true,
      render: (val) => {
        const vend = vendorMap.get(val);
        return (
          <div>
            <div className="fw-semibold text-dark">{vend?.VendorName || `Vendor #${val}`}</div>
            <div className="small text-muted font-monospace">{vend?.GSTNumber}</div>
          </div>
        );
      },
    },
    {
      key: "InvoiceDate",
      label: "Invoice Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
    {
      key: "InvoiceAmount",
      label: "Base Amount",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="small text-secondary">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "GSTAmount",
      label: "GST (18%)",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="small text-muted">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "TotalAmount",
      label: "Total Payable",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-bold text-dark">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "PaymentStatus",
      label: "Payment Status",
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Vendor Invoices</h4>
          <p className="text-muted small mb-0">
            Accounts payable registry, tax invoice matching against goods receipts, and settlement status.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-receipt"></i>
          <span>Create Vendor Invoice</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        keyField="InvoiceID"
        searchPlaceholder="Search by invoice number, supplier, status..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Invoice Voucher"
            >
              <i className="bi bi-file-earmark-medical"></i>
            </button>
            <button
              className="btn btn-outline-primary btn-action"
              onClick={() => handleOpenEdit(row)}
              title="Edit Invoice"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setDeleteDialog({
                  open: true,
                  id: row.InvoiceID,
                  invNumber: row.InvoiceNumber,
                })
              }
              title="Delete Invoice"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW INVOICE VOUCHER MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Tax Invoice Voucher"
        icon="bi-receipt-cutoff"
        size="lg"
        footer={
          <div className="d-flex justify-content-between w-100 align-items-center">
            <span className="small text-muted">Settlement: <StatusBadge status={viewModal.data?.PaymentStatus} /></span>
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
          const vend = vendorMap.get(viewModal.data.VendorID);
          const gr = grMap.get(viewModal.data.GRID);
          const po = poMap.get(viewModal.data.POID);

          return (
            <div className="erp-document">
              <div className="document-header">
                <div>
                  <h3 className="fw-bold mb-0 text-dark">TAX INVOICE VOUCHER</h3>
                  <div className="text-muted small">SAP-Inspired Accounts Payable</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold fs-4 text-primary font-monospace">{viewModal.data.InvoiceNumber}</div>
                  <div className="small text-muted">Date: {viewModal.data.InvoiceDate}</div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Billed By (Vendor)</h6>
                    <div className="fw-bold fs-6">{vend?.VendorName}</div>
                    <div className="text-muted small font-monospace">GSTIN: {vend?.GSTNumber || "Unregistered"}</div>
                    <div className="text-muted small">{vend?.Address}, {vend?.City}</div>
                    <div className="text-muted small">Payment Terms: {vend?.PaymentTerms || "Net 30"}</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Procurement References</h6>
                    <div><strong>Goods Receipt:</strong> <span className="font-monospace text-purple" style={{ color: "#6f42c1" }}>{gr?.GRNumber}</span></div>
                    <div><strong>Purchase Order:</strong> <span className="font-monospace text-primary">{po?.PONumber}</span></div>
                    <div><strong>Payment Status:</strong> <StatusBadge status={viewModal.data.PaymentStatus} /></div>
                  </div>
                </div>
              </div>

              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Billing Description</th>
                    <th className="text-end">Base Amount (₹)</th>
                    <th className="text-end">GST @ 18% (₹)</th>
                    <th className="text-end">Total Payable (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Procurement fulfillment for {gr?.GRNumber || "Goods Delivery"}</td>
                    <td className="text-end">₹{Number(viewModal.data.InvoiceAmount || 0).toFixed(2)}</td>
                    <td className="text-end">₹{Number(viewModal.data.GSTAmount || 0).toFixed(2)}</td>
                    <td className="text-end fw-bold">₹{Number(viewModal.data.TotalAmount || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="document-total-box">
                Total Invoiced Commitment: ₹{Number(viewModal.data.TotalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>

              {viewModal.data.Remarks && (
                <div className="mt-3 p-2 bg-light rounded small text-secondary">
                  <strong>Invoice Remarks:</strong> {viewModal.data.Remarks}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* CREATE / EDIT INVOICE MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Edit Invoice Details" : "Generate Invoice against Goods Receipt"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-receipt"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit ? (
              <div className="col-12">
                <label className="form-label small fw-semibold text-secondary">
                  Select Completed Goods Receipt <span className="text-danger">*</span>
                </label>
                {availableCompletedGRs.length > 0 ? (
                  <select
                    className="form-select form-select-sm"
                    value={formData.GRID}
                    onChange={(e) => setFormData({ ...formData, GRID: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Completed Goods Receipt --</option>
                    {availableCompletedGRs.map((gr) => {
                      const po = poMap.get(gr.POID);
                      const vend = vendorMap.get(gr.VendorID);
                      return (
                        <option key={gr.GRID} value={gr.GRID}>
                          {gr.GRNumber} (PO: {po?.PONumber}) from {vend?.VendorName} - Received on {gr.ReceiptDate}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="alert alert-warning py-2 small mb-0">
                    No uninvoiced Completed Goods Receipts found. Create a Goods Receipt first.
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12">
                <div className="document-meta-box py-2">
                  <div className="small text-muted">Invoice Number: <strong>{formModal.data?.InvoiceNumber}</strong></div>
                  <div className="small text-muted">Invoice Date: {formModal.data?.InvoiceDate}</div>
                </div>
              </div>
            )}

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">
                Base Invoice Amount (₹) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control form-control-sm"
                placeholder="e.g. 20000.00"
                value={formData.InvoiceAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">
                GST Amount @ 18% (₹) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control form-control-sm"
                value={formData.GSTAmount}
                onChange={(e) => setFormData({ ...formData, GSTAmount: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Computed Total (₹)</label>
              <input
                type="text"
                className="form-control form-control-sm bg-light fw-bold text-success"
                value={`₹${calculatedTotal}`}
                readOnly
              />
            </div>

            {formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">Payment Status</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.PaymentStatus}
                  onChange={(e) => setFormData({ ...formData, PaymentStatus: e.target.value })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            )}

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Remarks</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Invoice notes, tax identifiers, verification details..."
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
              disabled={actionLoading || (!formModal.isEdit && availableCompletedGRs.length === 0)}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Processing...
                </>
              ) : formModal.isEdit ? (
                "Update Invoice"
              ) : (
                "Post Invoice"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, invNumber: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor Invoice"
        message={`Are you sure you want to delete invoice "${deleteDialog.invNumber}"?`}
        confirmText="Delete Invoice"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

