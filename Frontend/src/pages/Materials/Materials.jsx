import { useState, useEffect, useCallback, useMemo } from "react";
import materialsApi from "../../api/materials";
import DataTable from "../../components/Common/DataTable";
import StatusBadge from "../../components/Common/StatusBadge";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function Materials() {
  const { showToast } = useToast();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [formModal, setFormModal] = useState({ open: false, isEdit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const initialFormState = {
    MaterialCode: "",
    MaterialName: "",
    Category: "Raw Material",
    MaterialType: "Standard",
    UnitOfMeasure: "EA",
    UnitPrice: "",
    CurrentStock: "",
    ReorderLevel: "",
    StorageLocation: "WH-01",
    Plant: "Plant-1000",
    Status: "Active",
    CreatedDate: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await materialsApi.getAll();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to retrieve materials from backend.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Dynamic filter options from loaded data
  const filterConfigs = useMemo(() => {
    const categories = Array.from(new Set(materials.map((m) => m.Category).filter(Boolean))).map(
      (c) => ({ label: c, value: c })
    );
    const plants = Array.from(new Set(materials.map((m) => m.Plant).filter(Boolean))).map(
      (p) => ({ label: p, value: p })
    );

    return [
      { key: "Category", label: "Categories", options: categories },
      { key: "Plant", label: "Plants", options: plants },
      {
        key: "Status",
        label: "Statuses",
        options: [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ],
      },
    ];
  }, [materials]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setFormModal({ open: true, isEdit: false, data: null });
  };

  // Open Edit Modal
  const handleOpenEdit = (material) => {
    setFormData({
      MaterialName: material.MaterialName || "",
      Category: material.Category || "",
      MaterialType: material.MaterialType || "",
      UnitOfMeasure: material.UnitOfMeasure || "",
      UnitPrice: material.UnitPrice !== undefined ? material.UnitPrice : "",
      CurrentStock: material.CurrentStock !== undefined ? material.CurrentStock : "",
      ReorderLevel: material.ReorderLevel !== undefined ? material.ReorderLevel : "",
      StorageLocation: material.StorageLocation || "",
      Plant: material.Plant || "",
      Status: material.Status || "Active",
    });
    setFormModal({ open: true, isEdit: true, data: material });
  };

  // Submit Create or Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (formModal.isEdit) {
        // Update Payload
        const updatePayload = {
          MaterialName: formData.MaterialName,
          Category: formData.Category,
          MaterialType: formData.MaterialType,
          UnitOfMeasure: formData.UnitOfMeasure,
          UnitPrice: parseFloat(formData.UnitPrice),
          CurrentStock: parseInt(formData.CurrentStock, 10),
          ReorderLevel: parseInt(formData.ReorderLevel, 10),
          StorageLocation: formData.StorageLocation,
          Plant: formData.Plant,
          Status: formData.Status,
        };
        await materialsApi.update(formModal.data.MaterialID, updatePayload);
        showToast(`Material "${formData.MaterialName}" updated successfully.`, "success");
      } else {
        // Create Payload
        const createPayload = {
          MaterialCode: formData.MaterialCode.trim(),
          MaterialName: formData.MaterialName.trim(),
          Category: formData.Category,
          MaterialType: formData.MaterialType,
          UnitOfMeasure: formData.UnitOfMeasure,
          UnitPrice: parseFloat(formData.UnitPrice),
          CurrentStock: parseInt(formData.CurrentStock, 10),
          ReorderLevel: parseInt(formData.ReorderLevel, 10),
          StorageLocation: formData.StorageLocation,
          Plant: formData.Plant,
          Status: formData.Status,
          CreatedDate: formData.CreatedDate,
        };
        await materialsApi.create(createPayload);
        showToast(`Material "${formData.MaterialName}" created successfully.`, "success");
      }

      setFormModal({ open: false, isEdit: false, data: null });
      loadMaterials();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to save material.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setActionLoading(true);
    try {
      await materialsApi.delete(deleteDialog.id);
      showToast(`Material "${deleteDialog.name}" deleted.`, "success");
      setDeleteDialog({ open: false, id: null, name: "" });
      loadMaterials();
    } catch (err) {
      showToast(err.friendlyMessage || "Failed to delete material.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Stock status indicator helper
  const getStockStatusBadge = (stock, reorder) => {
    if (stock <= 0) {
      return <span className="badge bg-danger">Out of Stock</span>;
    }
    if (stock <= reorder) {
      return <span className="badge bg-warning text-dark">Low Stock ({stock})</span>;
    }
    return <span className="badge bg-success-subtle text-success border border-success-subtle">{stock} (Normal)</span>;
  };

  const columns = [
    { key: "MaterialID", label: "ID", sortable: true },
    {
      key: "MaterialCode",
      label: "Code",
      sortable: true,
      render: (val) => <span className="badge bg-secondary-subtle text-dark font-monospace">{val}</span>,
    },
    {
      key: "MaterialName",
      label: "Material Name",
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="fw-semibold text-dark">{val}</span>
          <div className="small text-muted">{row.Category} • {row.MaterialType}</div>
        </div>
      ),
    },
    {
      key: "UnitPrice",
      label: "Unit Price",
      sortable: true,
      align: "right",
      render: (val) => (
        <span className="fw-semibold">
          ₹{Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "CurrentStock",
      label: "Stock Health",
      sortable: true,
      render: (val, row) => getStockStatusBadge(Number(val), Number(row.ReorderLevel)),
    },
    {
      key: "ReorderLevel",
      label: "Reorder Level",
      sortable: true,
      align: "center",
      render: (val, row) => (
        <span className="text-secondary small">
          {val} {row.UnitOfMeasure}
        </span>
      ),
    },
    {
      key: "Plant",
      label: "Plant / Loc",
      sortable: true,
      render: (val, row) => (
        <span className="small text-secondary">
          {val} / {row.StorageLocation}
        </span>
      ),
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
      {/* Header with Title and Create Button */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Materials Master Data</h4>
          <p className="text-muted small mb-0">
            Catalog of inventory materials, storage locations, stock thresholds, and valuation.
          </p>
        </div>
        <button className="btn btn-erp-primary" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Create Material</span>
        </button>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={materials}
        loading={loading}
        keyField="MaterialID"
        searchPlaceholder="Search material by code, name, category, plant..."
        filterConfigs={filterConfigs}
        onRefresh={loadMaterials}
        actions={(row) => (
          <div className="d-flex align-items-center justify-content-end gap-1">
            <button
              className="btn btn-outline-secondary btn-action"
              onClick={() => setViewModal({ open: true, data: row })}
              title="View Material Details"
            >
              <i className="bi bi-eye"></i>
            </button>
            <button
              className="btn btn-outline-primary btn-action"
              onClick={() => handleOpenEdit(row)}
              title="Edit Material"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-outline-danger btn-action"
              onClick={() =>
                setDeleteDialog({
                  open: true,
                  id: row.MaterialID,
                  name: `${row.MaterialCode} - ${row.MaterialName}`,
                })
              }
              title="Delete Material"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        )}
      />

      {/* VIEW MATERIAL MODAL */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Material Master Details"
        icon="bi-box-seam"
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
                <label className="text-muted small">Material ID</label>
                <div className="fw-bold">{viewModal.data.MaterialID}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Material Code</label>
                <div className="fw-bold font-monospace text-primary">
                  {viewModal.data.MaterialCode}
                </div>
              </div>
              <div className="col-12">
                <label className="text-muted small">Material Name</label>
                <div className="fw-bold fs-6">{viewModal.data.MaterialName}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Category</label>
                <div>{viewModal.data.Category}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Material Type</label>
                <div>{viewModal.data.MaterialType}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Unit Price</label>
                <div className="fw-bold text-success">
                  ₹{Number(viewModal.data.UnitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Unit of Measure</label>
                <div>{viewModal.data.UnitOfMeasure}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Current Stock</label>
                <div className="fw-bold">{viewModal.data.CurrentStock}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Reorder Level</label>
                <div className="fw-bold text-warning">{viewModal.data.ReorderLevel}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Storage Location</label>
                <div>{viewModal.data.StorageLocation}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Plant</label>
                <div>{viewModal.data.Plant}</div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Status</label>
                <div><StatusBadge status={viewModal.data.Status} /></div>
              </div>
              <div className="col-6">
                <label className="text-muted small">Created Date</label>
                <div className="small text-secondary">{viewModal.data.CreatedDate || "N/A"}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT MATERIAL MODAL */}
      <Modal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, data: null })}
        title={formModal.isEdit ? "Edit Material Master" : "Create New Material"}
        icon={formModal.isEdit ? "bi-pencil-square" : "bi-plus-circle"}
        size="lg"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="row g-3">
            {!formModal.isEdit && (
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">
                  Material Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm font-monospace"
                  placeholder="e.g. MAT101"
                  value={formData.MaterialCode}
                  onChange={(e) => setFormData({ ...formData, MaterialCode: e.target.value })}
                  maxLength={10}
                  required
                />
              </div>
            )}

            <div className={formModal.isEdit ? "col-md-12" : "col-md-6"}>
              <label className="form-label small fw-semibold text-secondary">
                Material Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Industrial Steel Plate"
                value={formData.MaterialName}
                onChange={(e) => setFormData({ ...formData, MaterialName: e.target.value })}
                maxLength={100}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Category</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Raw Material, Electronics, Packaging"
                value={formData.Category}
                onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Material Type</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Standard, Custom, Consumable"
                value={formData.MaterialType}
                onChange={(e) => setFormData({ ...formData, MaterialType: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-secondary">Unit of Measure</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. EA, KG, LTR, MTR, BOX"
                value={formData.UnitOfMeasure}
                onChange={(e) => setFormData({ ...formData, UnitOfMeasure: e.target.value })}
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
                min="0"
                className="form-control form-control-sm"
                placeholder="0.00"
                value={formData.UnitPrice}
                onChange={(e) => setFormData({ ...formData, UnitPrice: e.target.value })}
                required
              />
            </div>

            <div className="col-md-4">
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

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Current Stock <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                placeholder="0"
                value={formData.CurrentStock}
                onChange={(e) => setFormData({ ...formData, CurrentStock: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">
                Reorder Level <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                placeholder="10"
                value={formData.ReorderLevel}
                onChange={(e) => setFormData({ ...formData, ReorderLevel: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Storage Location</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. WH-01, Bin-A3"
                value={formData.StorageLocation}
                onChange={(e) => setFormData({ ...formData, StorageLocation: e.target.value })}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-secondary">Plant</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Plant-1000, Plant-2000"
                value={formData.Plant}
                onChange={(e) => setFormData({ ...formData, Plant: e.target.value })}
                required
              />
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
                "Update Material"
              ) : (
                "Save Material"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, name: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete Material Master Record"
        message={`Are you sure you want to delete "${deleteDialog.name}"? This action will permanently remove it from the material catalog.`}
        confirmText="Delete Material"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

