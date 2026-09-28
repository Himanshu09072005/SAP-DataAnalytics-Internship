import { useState, useEffect, useCallback, useMemo } from "react";
import paymentsApi from "../../api/payments";
import invoicesApi from "../../api/invoices";
import vendorsApi from "../../api/vendors";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function Payments() {
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, payNumber: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Helper for generating sample reference
  const generateRef = () => `TXN${Date.now().toString().slice(-8)}`;

  // Form State
  const initialFormState = {
    InvoiceID: "",
    PaymentMethod: "Bank Transfer",
    AmountPaid: "",
    TransactionReference: generateRef(),
    Remarks: "Settlement executed via corporate banking.",
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payData, invData, vendData] = await Promise.all([
        paymentsApi.getAll(),
        invoicesApi.getAll(),
        vendorsApi.getAll(),
      ]);

      setPayments(Array.isArray(payData) ? payData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load payments.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup maps
  const invoiceMap = useMemo(() => new Map(invoices.map((i) => [i.InvoiceID, i])), [invoices]);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.VendorID, v])), [vendors]);

  // Compute paid amounts per invoice from real payments
  const invoicePaidAmounts = useMemo(() => {
    const map = new Map();
    payments.forEach((p) => {
      if (p.Status === "Completed") {
        const current = map.get(p.InvoiceID) || 0;
        map.set(p.InvoiceID, current + parseFloat(p.AmountPaid || 0));
      }
    });
    return map;
  }, [payments]);

  // Invoices eligible for payment (not fully paid)
  const payableInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.PaymentStatus === "Paid") return false;
      const paid = invoicePaidAmounts.get(inv.InvoiceID) || 0;
      return paid < parseFloat(inv.TotalAmount);
    });
  }, [invoices, invoicePaidAmounts]);

  // Selected invoice in modal
  const selectedInvoice = useMemo(() => {
    if (!formData.InvoiceID) return null;
    return invoiceMap.get(parseInt(formData.InvoiceID, 10));
  }, [formData.InvoiceID, invoiceMap]);

  const remainingBalance = useMemo(() => {
    if (!selectedInvoice) return 0;
    const paid = invoicePaidAmounts.get(selectedInvoice.InvoiceID) || 0;
    return Math.max(0, parseFloat(selectedInvoice.TotalAmount) - paid);
  }, [selectedInvoice, invoicePaidAmounts]);

  const filterConfigs = [
    {
      key: "PaymentMethod",
      label: "Payment Methods",
      options: [
        { label: "Bank Transfer", value: "Bank Transfer" },
        { label: "NEFT", value: "NEFT" },
        { label: "RTGS", value: "RTGS" },
        { label: "UPI", value: "UPI" },
        { label: "Cheque", value: "Cheque" },
      ],
    },
    {
      key: "Status",
      label: "Statuses",
      options: [
        { label: "Completed", value: "Completed" },
        { label: "Processing", value: "Processing" },
        { label: "Failed", value: "Failed" },
      ],
    },
  ];

  const handleOpenCreate = () => {
    if (payableInvoices.length === 0) {
      showToast("All vendor invoices are fully settled. No pending payments.", "info");
    }
    setFormData({ ...initialFormState, TransactionReference: generateRef() });
    setFormModal({ open: true, isEdit: false, data: null });
  };

  const handleInvoiceChange = (e) => {
    const invId = e.target.value;
    const inv = invoiceMap.get(parseInt(invId, 10));
    let bal = "";
    if (inv) {
      const paid = invoicePaidAmounts.get(inv.InvoiceID) || 0;
      bal = Math.max(0, parseFloat(inv.TotalAmount) - paid).toFixed(2);
    }
    setFormData((prev) => ({
      ...prev,
      InvoiceID: invId,
      AmountPaid: bal,
    }));
  };

  const handleOpenEdit = (pay) => {
    setFormData({
      InvoiceID: pay.InvoiceID,
      PaymentMethod: pay.PaymentMethod || "Bank Transfer",
      AmountPaid: pay.AmountPaid,
      TransactionReference: pay.TransactionReference,
      Status: pay.Status || "Completed",
      Remarks: pay.Remarks || "",
    });
    setFormModal({ open: true, isEdit: true, data: pay });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          PaymentMethod: formData.PaymentMethod,
          AmountPaid: parseFloat(formData.AmountPaid),
          TransactionReference: formData.TransactionReference.trim(),
          Status: formData.Status,
          Remarks: formData.Remarks,
        };
        await paymentsApi.update(formModal.data.PaymentID, updatePayload);
        showToast(`Payment "${formModal.data.PaymentNumber}" updated successfully.`, "success");
      } else {
        const amt = parseFloat(formData.AmountPaid);
        if (amt <= 0) {
          showToast("Payment amount must be greater than zero.", "warning");
          setActionLoading(false);
          return;
        }

        if (amt > remainingBalance + 0.01) {
          showToast(
            `Payment amount (₹${amt}) exceeds outstanding invoice balance (₹${remainingBalance.toFixed(2)}).`,
            "warning"
          );
          setActionLoading(false);
          return;
        }

        const createPayload = {
          InvoiceID: parseInt(formData.InvoiceID, 10),
          PaymentMethod: formData.PaymentMethod,
          AmountPaid: amt,
          TransactionReference: formData.TransactionReference.trim(),
          Remarks: formData.Remarks,
        };
        await paymentsApi.create(createPayload);
        showToast("Payment disbursement recorded and invoice payment status updated.", "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to process payment.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setActionLoading(true);
    try {
      await paymentsApi.delete(deleteDialog.id);
      showToast(`Payment "${deleteDialog.payNumber}" deleted and invoice status adjusted.`, "success");
      setDeleteDialog({ open: false, id: null, payNumber: "" });
      loadData();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to delete payment.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "PaymentNumber",
      label: "Payment Ref",
      sortable: true,
      render: (val) => <span className="badge bg-success-subtle text-success font-monospace fw-bold">{val}</span>,
    },
    {
      key: "InvoiceID",
      label: "Invoice",
      sortable: true,
      render: (val) => {
        const inv = invoiceMap.get(val);
        return (
          <div>
            <span className="font-monospace text-primary fw-semibold">{inv?.InvoiceNumber || `INV #${val}`}</span>
            <div className="small text-muted">Total: ₹{Number(inv?.TotalAmount || 0).toLocaleString()}</div>
          </div>
        );
      },
    },
    {
      key: "VendorID",
      label: "Payee / Supplier",
      sortable: true,
      render: (val) => {
        const vend = vendorMap.get(val);
        return (
          <div>
            <div className="fw-semibold text-dark">{vend?.VendorName || `Vendor #${val}`}</div>
            <div className="small text-muted">{vend?.City}, {vend?.State}</div>
          </div>
        );
      },
    },
    {
      key: "PaymentDate",
      label: "Payment Date",
      sortable: true,
      render: (val) => <span className="small text-secondary">{val}</span>,
    },
    {
      key: "PaymentMethod",
      label: "Method",
      sortable: true,
      render: (val) => <span className="badge bg-light text-dark border">{val}</span>,
    },
    {
      key: "AmountPaid",
      label: "Disbursed Amount",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-bold text-success fs-6">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "TransactionReference",
      label: "Bank Ref / UTR",
      sortable: true,
      render: (val) => <span className="small font-monospace text-secondary">{val}</span>,
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
          <h4 className="fw-bold mb-1">Payment Transactions</h4>
          <p className="text-muted small mb-0">
            Outward remittance ledger, supplier settlement tracking, and bank reference reconciliation.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-credit-card-2-front"></i>
          <span>Record Vendor Payment</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        keyField="PaymentID"
        searchPlaceholder="Search by payment number, invoice, UTR ref..."
        filterConfigs={filterConfigs}
        onRefresh={loadData}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Payment Voucher"
            >
              <i className="bi bi-receipt"></i>
            </button>
            <button
              className="btn btn-outline-primary btn-action"
              onClick={() => handleOpenEdit(row)}
              title="Edit Payment"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setDeleteDialog({
                  open: true,
                  id: row.PaymentID,
                  payNumber: row.PaymentNumber,
                })
              }
              title="Delete Payment"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW PAYMENT RECEIPT MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Payment Remittance Voucher"
        icon="bi-credit-card"
        size="lg"
        footer={
          <div className="d-flex justify-content-between w-100 align-items-center">
            <span className="small text-muted">Status: <StatusBadge status={viewModal.data?.Status} /></span>
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
          const inv = invoiceMap.get(viewModal.data.InvoiceID);
          const vend = vendorMap.get(viewModal.data.VendorID);

          return (
            <div className="erp-document">
              <div className="document-header">
                <div>
                  <h3 className="fw-bold mb-0 text-dark">PAYMENT REMITTANCE RECEIPT</h3>
                  <div className="text-muted small">SAP-Inspired Treasury & Accounts Payable</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold fs-4 text-success font-monospace">{viewModal.data.PaymentNumber}</div>
                  <div className="small text-muted">Execution Date: {viewModal.data.PaymentDate}</div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Remitted To (Payee)</h6>
                    <div className="fw-bold fs-6">{vend?.VendorName}</div>
                    <div className="text-muted small">Vendor Code: {vend?.VendorCode}</div>
                    <div className="text-muted small">City/State: {vend?.City}, {vend?.State}</div>
                    <div className="text-muted small font-monospace">GST: {vend?.GSTNumber}</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="document-meta-box h-100">
                    <h6 className="fw-bold small text-uppercase text-secondary mb-2">Banking Transaction Details</h6>
                    <div><strong>Invoice Reference:</strong> <span className="font-monospace text-primary">{inv?.InvoiceNumber}</span></div>
                    <div><strong>Payment Method:</strong> {viewModal.data.PaymentMethod}</div>
                    <div><strong>Bank Reference / UTR:</strong> <span className="font-monospace fw-semibold">{viewModal.data.TransactionReference}</span></div>
                    <div><strong>Remittance Status:</strong> <StatusBadge status={viewModal.data.Status} /></div>
                  </div>
                </div>
              </div>

              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Settlement Description</th>
                    <th>Instrument</th>
                    <th>Transaction Ref</th>
                    <th className="text-end">Amount Settled (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Invoice Settlement against {inv?.InvoiceNumber}</td>
                    <td>{viewModal.data.PaymentMethod}</td>
                    <td className="font-monospace">{viewModal.data.TransactionReference}</td>
                    <td className="text-end fw-bold text-success fs-6">
                      ₹{Number(viewModal.data.AmountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="document-total-box text-success">
                Net Settled Amount: ₹{Number(viewModal.data.AmountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>

              {viewModal.data.Remarks && (
                <div className="mt-3 p-2 bg-light rounded small text-secondary">
                  <strong>Remittance Remarks:</strong> {viewModal.data.Remarks}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* CREATE / EDIT PAYMENT MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Update Payment Entry" : "Record Supplier Payment"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-credit-card-2-front"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit ? (
              <div className="col-12">
                <label className="form-label small fw-semibold text-secondary">
                  Select Pending Invoice <span className="text-danger">*</span>
                </label>
                {payableInvoices.length > 0 ? (
                  <select
                    className="form-select form-select-sm"
                    value={formData.InvoiceID}
                    onChange={handleInvoiceChange}
                    required
                  >
                    <option value="">-- Choose Invoice to Settle --</option>
                    {payableInvoices.map((inv) => {
                      const vend = vendorMap.get(inv.VendorID);
                      const paid = invoicePaidAmounts.get(inv.InvoiceID) || 0;
                      const bal = parseFloat(inv.TotalAmount) - paid;
                      return (
                        <option key={inv.InvoiceID} value={inv.InvoiceID}>
                          {inv.InvoiceNumber} - {vend?.VendorName} (Outstanding Balance: ₹{bal.toFixed(2)} of ₹{Number(inv.TotalAmount).toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="alert alert-info py-2 small mb-0">
                    No outstanding vendor invoices currently require payment.
                  </div>
                )}
              </div>
            ) : (
              <div className="col-12">
                <div className="document-meta-box py-2">
                  <div className="small text-muted">Payment Number: <strong>{formModal.data?.PaymentNumber}</strong></div>
                  <div className="small text-muted">Payment Date: {formModal.data?.PaymentDate}</div>
                </div>
              </div>
            )}

            {selectedInvoice && !formModal.isEdit && (
              <div className="col-12">
                <div className="p-2 bg-light border rounded small d-flex justify-content-between align-items-center">
                  <span><strong>Total Invoiced:</strong> ₹{Number(selectedInvoice.TotalAmount).toFixed(2)}</span>
                  <span><strong>Previously Paid:</strong> ₹{(invoicePaidAmounts.get(selectedInvoice.InvoiceID) || 0).toFixed(2)}</span>
                  <span className="text-primary fw-bold"><strong>Outstanding Due:</strong> ₹{remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Amount to Pay (₹) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={!formModal.isEdit ? remainingBalance : undefined}
                className="form-control form-control-sm font-monospace fw-bold"
                placeholder="0.00"
                value={formData.AmountPaid}
                onChange={(e) => setFormData({ ...formData, AmountPaid: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Payment Method</label>
              <select
                className="form-select form-select-sm"
                value={formData.PaymentMethod}
                onChange={(e) => setFormData({ ...formData, PaymentMethod: e.target.value })}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="NEFT">NEFT (National Electronic Funds)</option>
                <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                <option value="UPI">UPI (Unified Payments Interface)</option>
                <option value="Cheque">Corporate Cheque</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Transaction Reference / UTR <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. TXN98765432"
                value={formData.TransactionReference}
                onChange={(e) => setFormData({ ...formData, TransactionReference: e.target.value })}
                required
              />
            </div>

            {formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.Status}
                  onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                >
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            )}

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Remittance Remarks</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Bank advice remarks, purpose code, narration..."
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
              disabled={actionLoading || (!formModal.isEdit && payableInvoices.length === 0)}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Processing...
                </>
              ) : formModal.isEdit ? (
                "Update Payment"
              ) : (
                "Execute Payment"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, payNumber: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment Record"
        message={`Are you sure you want to delete payment record "${deleteDialog.payNumber}"? The linked invoice status will be automatically adjusted.`}
        confirmText="Delete Payment"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

