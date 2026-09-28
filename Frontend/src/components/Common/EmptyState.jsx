export default function EmptyState({
  icon = "bi-inbox",
  title = "No records found",
  description = "There are no entries available to display at this time.",
  actionText,
  onAction,
}) {
  return (
    <div className="text-center py-5 px-3">
      <div
        className="mx-auto mb-3 d-flex align-items-center justify-content-center text-muted"
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          fontSize: "2rem",
        }}
      >
        <i className={`bi ${icon}`}></i>
      </div>
      <h6 className="fw-bold text-dark mb-1">{title}</h6>
      <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: "380px" }}>
        {description}
      </p>
      {actionText && onAction && (
        <button className="btn btn-erp-primary btn-sm" onClick={onAction}>
          <i className="bi bi-plus-lg me-1"></i>
          {actionText}
        </button>
      )}
    </div>
  );
}

