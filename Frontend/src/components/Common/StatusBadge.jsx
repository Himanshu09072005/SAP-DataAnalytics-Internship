export default function StatusBadge({ status, type = "status" }) {
  if (!status) return null;

  const getBadgeClass = (s, t) => {
    const val = String(s).toLowerCase();

    if (t === "priority") {
      if (val === "urgent") return "badge-priority-urgent";
      if (val === "high") return "badge-priority-high";
      if (val === "medium") return "badge-priority-medium";
      return "badge-priority-low";
    }

    // Success group
    if (["active", "approved", "completed", "paid", "in stock", "accepted"].includes(val)) {
      return "erp-badge erp-badge-success";
    }

    // Warning group
    if (["pending", "partially paid", "partially accepted", "low stock"].includes(val)) {
      return "erp-badge erp-badge-warning";
    }

    // Danger group
    if (["rejected", "cancelled", "failed", "inactive", "reorder required", "out of stock"].includes(val)) {
      return "erp-badge erp-badge-danger";
    }

    // Info group
    if (["open", "ordered", "processing", "pending inspection"].includes(val)) {
      return "erp-badge erp-badge-info";
    }

    return "erp-badge erp-badge-secondary";
  };

  const badgeClass = getBadgeClass(status, type);

  if (type === "priority") {
    return <span className={`badge ${badgeClass}`}>{status}</span>;
  }

  return (
    <span className={badgeClass}>
      <span className="badge-dot"></span>
      {status}
    </span>
  );
}

