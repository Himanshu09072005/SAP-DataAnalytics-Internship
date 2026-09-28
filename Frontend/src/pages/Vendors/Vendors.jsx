import { useState, useEffect, useCallback, useMemo } from "react";
import vendorsApi from "../../api/vendors";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function Vendors() {
  const { showToast } = useToast();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialFormState = {
    VendorCode: "",
    VendorName: "",
    ContactPerson: "",
    Phone: "",
    Email: "",
    GSTNumber: "",
    Address: "",
    City: "",
    State: "",
    Country: "India",
    PostalCode: "",
    PaymentTerms: "Net 30",
    Status: "Active",
    CreatedDate: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorsApi.getAll();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to load vendors from backend.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  // Dynamic filter options
  const filterConfigs = useMemo(() => {
    const states = Array.from(new Set(vendors.map((v) => v.State).filter(Boolean))).map(
      (s) => ({ label: s, value: s })
    );

    return [
      { key: "State", label: "States", options: states },
      {
        key: "Status",
        label: "Statuses",
        options: [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ],
      },
    ];
  }, [vendors]);

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (vendor) => {
    setFormData({
      VendorName: vendor.VendorName || "",
      ContactPerson: vendor.ContactPerson || "",
      Phone: vendor.Phone || "",
      Email: vendor.Email || "",
      GSTNumber: vendor.GSTNumber || "",
      Address: vendor.Address || "",
      City: vendor.City || "",
      State: vendor.State || "",
      Country: vendor.Country || "India",
      PostalCode: vendor.PostalCode || "",
      PaymentTerms: vendor.PaymentTerms || "Net 30",
      Status: vendor.Status || "Active",
    });
    setFormModal({ open: true, isEdit: true, data: vendor });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        const updatePayload = {
          VendorName: formData.VendorName.trim(),
          ContactPerson: formData.ContactPerson.trim(),
          Phone: formData.Phone.trim(),
          Email: formData.Email.trim() || undefined,
          GSTNumber: formData.GSTNumber.trim(),
          Address: formData.Address.trim(),
          City: formData.City.trim(),
          State: formData.State.trim(),
          Country: formData.Country.trim(),
          PostalCode: formData.PostalCode.trim(),
          PaymentTerms: formData.PaymentTerms.trim(),
          Status: formData.Status,
        };
        await vendorsApi.update(formModal.data.VendorID, updatePayload);
        showToast(`Vendor "${formData.VendorName}" updated successfully.`, "success");
      } else {
        const createPayload = {
          VendorCode: formData.VendorCode.trim(),
          VendorName: formData.VendorName.trim(),
          ContactPerson: formData.ContactPerson.trim(),
          Phone: formData.Phone.trim(),
          Email: formData.Email.trim() || undefined,
          GSTNumber: formData.GSTNumber.trim(),
          Address: formData.Address.trim(),
          City: formData.City.trim(),
          State: formData.State.trim(),
          Country: formData.Country.trim(),
          PostalCode: formData.PostalCode.trim(),
          PaymentTerms: formData.PaymentTerms.trim(),
          Status: formData.Status,
          CreatedDate: formData.CreatedDate,
        };
        await vendorsApi.create(createPayload);
        showToast(`Vendor "${formData.VendorName}" registered successfully.`, "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadVendors();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to save vendor.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setActionLoading(true);
    try {
      await vendorsApi.delete(deleteDialog.id);
      showToast(`Vendor "${deleteDialog.name}" deleted.`, "success");
      setDeleteDialog({ open: false, id: null, name: "" });
      loadVendors();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to delete vendor.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: "VendorID", label: "ID", sortable: true },
    {
      key: "VendorCode",
      label: "Code",
      sortable: true,
      render: (val) => <span className="badge bg-secondary-subtle text-dark font-monospace">{val}</span>,
    },
    {
      key: "VendorName",
      label: "Vendor Name",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="fw-semibold text-dark">{val}</span>
          <div className="small text-muted">{row.ContactPerson || "Contact N/A"}</div>
        </div>
      ),
    },
    {
      key: "Phone",
      label: "Contact Phone",
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="small"><i className="bi bi-telephone text-muted me-1"></i>{val || "-"}</div>
          {row.Email && (
            <div className="small text-muted"><i className="bi bi-envelope text-muted me-1"></i>{row.Email}</div>
          )}
        </div>
      ),
    },
    {
      key: "City",
      label: "Location",
      sortable: true,
      render: (val, row) => (
        <span className="small text-secondary">
          {val ? `${val}, ${row.State || ""}` : row.State || "-"}
        </span>
      ),
    },
    {
      key: "GSTNumber",
      label: "GST Number",
      sortable: true,
      render: (val) => (
        <span className="small font-monospace text-secondary">{val || "Unregistered"}</span>
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
          <h4 className="fw-bold mb-1">Vendor Master Data</h4>
          <p className="text-muted small mb-0">
            Approved suppliers, payment settlement terms, contact details, and compliance records.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-building-add"></i>
          <span>Add New Vendor</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        keyField="VendorID"
        searchPlaceholder="Search vendor by code, name, city, GST..."
        filterConfigs={filterConfigs}
        onRefresh={loadVendors}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Vendor Details"
            >
              <i className="bi bi-eye"></i>
            </button>
            <button
              className="btn btn-outline-primary btn-action"
              onClick={() => handleOpenEdit(row)}
              title="Edit Vendor"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setDeleteDialog({
                  open: true,
                  id: row.VendorID,
                  name: `${row.VendorCode} - ${row.VendorName}`,
                })
              }
              title="Delete Vendor"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW VENDOR MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Vendor Master Profile"
        icon="bi-buildings"
        size="md"
        footer={
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setViewModal({ open: false, data: null })}
          >
            Close
          </button>
        }
      >
        {viewModal.data && (
          <div className="document-meta-box">
            <div className="row g-3">
              <div className="col-6">
                <label className="text-muted small">Vendor ID</label>
                <div className="fw-bold">{viewModal.data.VendorID}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Vendor Code</label>
                <div className="fw-bold font-monospace text-primary">
                  {viewModal.data.VendorCode}
                </div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Company / Vendor Name</label>
                <div className="fw-bold fs-6">{viewModal.data.VendorName}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Contact Person</label>
                <div>{viewModal.data.ContactPerson || "N/A"}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Phone</label>
                <div>{viewModal.data.Phone || "N/A"}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Email Address</label>
                <div>{viewModal.data.Email || "N/A"}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">GST Number</label>
                <div className="font-monospace fw-semibold">{viewModal.data.GSTNumber || "N/A"}</div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Registered Address</label>
                <div>{viewModal.data.Address || "N/A"}</div>
              </div>
              <div className="col-4">
                <label className="text-muted small">City</label>
                <div>{viewModal.data.City || "N/A"}</div>
              </div>
              <div className="col-4">
                <label className="text-muted small">State</label>
                <div>{viewModal.data.State || "N/A"}</div>
              </div>
              <div className="col-4">
                <label className="text-muted small">Postal Code</label>
                <div>{viewModal.data.PostalCode || "N/A"}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Payment Terms</label>
                <div className="fw-semibold">{viewModal.data.PaymentTerms || "Net 30"}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Status</label>
                <div><StatusBadge status={viewModal.data.Status} /></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT VENDOR MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Edit Vendor Master" : "Register New Vendor"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-building-add"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">
                  Vendor Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm font-monospace"
                  placeholder="e.g. VEND101"
                  value={formData.VendorCode}
                  onChange={(e) => setFormData({ ...formData, VendorCode: e.target.value })}
                  maxLength={10}
                  required
                />
              </div>
            )}

            <div className={formModal.isEdit ? "col-md-12" : "col-md-6"}>
              <label className="form-label small fw-semibold text-secondary">
                Vendor / Supplier Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Acme Industrial Supplies Pvt Ltd"
                value={formData.VendorName}
                onChange={(e) => setFormData({ ...formData, VendorName: e.target.value })}
                maxLength={100}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Contact Person</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Ramesh Kumar"
                value={formData.ContactPerson}
                onChange={(e) => setFormData({ ...formData, ContactPerson: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Phone Number</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. +91 9876543210"
                value={formData.Phone}
                onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Email Address</label>
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="vendor@domain.com"
                value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">GST Number</label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.GSTNumber}
                onChange={(e) => setFormData({ ...formData, GSTNumber: e.target.value })}
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary">Street Address</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Plot No, Industrial Area"
                value={formData.Address}
                onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">City</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Mumbai"
                value={formData.City}
                onChange={(e) => setFormData({ ...formData, City: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">State</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Maharashtra"
                value={formData.State}
                onChange={(e) => setFormData({ ...formData, State: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Postal Code</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="400001"
                value={formData.PostalCode}
                onChange={(e) => setFormData({ ...formData, PostalCode: e.target.value })}
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

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Status</label>
              <select
                className="form-select form-select-sm"
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {!formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">Created Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.CreatedDate}
                  onChange={(e) => setFormData({ ...formData, CreatedDate: e.target.value })}
                  required
                />
              </div>
            )}
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
                  Saving...
                </>
              ) : formModal.isEdit ? (
                "Update Vendor"
              ) : (
                "Save Vendor"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, name: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor Record"
        message={`Are you sure you want to delete vendor "${deleteDialog.name}"? This action cannot be undone.`}
        confirmText="Delete Vendor"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

