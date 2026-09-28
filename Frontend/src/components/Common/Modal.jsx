import { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = "md", // sm, md, lg
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="erp-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`erp-modal modal-${size}`}>
        <div className="erp-modal-header">
          <h5 className="erp-modal-title">
            {icon && <i className={`bi ${icon} text-primary`}></i>}
            {title}
          </h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>
        <div className="erp-modal-body">{children}</div>
        {footer && <div className="erp-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

