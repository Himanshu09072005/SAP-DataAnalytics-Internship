export default function StatCard({
  title,
  value,
  subtext,
  icon = "bi-bar-chart",
  variant = "blue", // blue, green, orange, red, purple, info
  prefix = "",
  suffix = "",
}) {
  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString("en-IN")
      : value !== undefined && value !== null
      ? value
      : 0;

  return (
    <div className={`stat-card stat-${variant}`}>
      <div className="stat-header">
        <span className="stat-label">{title}</span>
        <div className="stat-icon">
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
      <div>
        <div className="stat-value">
          {prefix}
          {formattedValue}
          {suffix}
        </div>
        {subtext && (
          <div className="stat-subtext">
            <span>{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
}

