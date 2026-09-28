import Modal from "./Modal";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action? This cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // danger, warning, primary
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      icon={variant === "danger" ? "bi-exclamation-triangle-fill" : "bi-question-circle-fill"}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-${variant} btn-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </>
      }
    >
      <div className="d-flex align-items-start gap-3">
        <div
          className={`text-${variant} fs-2`}
          style={{ lineHeight: 1 }}
        >
          <i
            className={`bi ${
              variant === "danger"
                ? "bi-exclamation-triangle"
                : "bi-question-circle"
            }`}
          ></i>
        </div>
        <div>
          <p className="mb-0 text-secondary" style={{ fontSize: "0.92rem" }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}

