import { useState } from "react";

// SAP-inspired color palette
export const CHART_COLORS = [
  "#0064d2", // SAP Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b", // Slate
];

/**
 * Vertical Bar Chart
 */
export function BarChart({ data = [], height = 240, valuePrefix = "", valueSuffix = "" }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-4 small">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const chartHeight = height - 50; // leave room for labels
  const barWidth = Math.min(48, Math.max(20, Math.floor(320 / data.length)));

  return (
    <div className="w-100 position-relative" style={{ height: `${height}px` }}>
      <svg width="100%" height={height} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - chartHeight * pct + 20;
          return (
            <g key={i}>
              <line x1="0" y1={y} x2="100%" y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x="0" y={y - 4} fill="#94a3b8" fontSize="10">
                {valuePrefix}
                {Math.round(maxValue * pct).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const val = Number(item.value) || 0;
          const barHeight = Math.max(4, (val / maxValue) * chartHeight);
          const totalWidth = 100 / data.length;
          const xPercent = (idx + 0.5) * totalWidth;
          const y = chartHeight - barHeight + 20;
          const color = item.color || CHART_COLORS[idx % CHART_COLORS.length];
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={`calc(${xPercent}% - ${barWidth / 2}px)`}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                style={{ transition: "all 0.2s ease" }}
              />
              {/* Value on top when hovered or fewer items */}
              {(isHovered || data.length <= 6) && (
                <text
                  x={`${xPercent}%`}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="11"
                  fontWeight="600"
                >
                  {valuePrefix}
                  {val.toLocaleString()}
                  {valueSuffix}
                </text>
              )}
              {/* X Label */}
              <text
                x={`${xPercent}%`}
                y={chartHeight + 36}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Donut / Pie Chart
 */
export function DonutChart({ data = [], size = 180, centerLabel = "Total" }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-4 small">No data available</div>;
  }

  const validData = data.filter((d) => Number(d.value) > 0);
  const total = validData.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  if (total === 0) {
    return <div className="text-center text-muted py-4 small">All values are 0</div>;
  }

  const radius = 65;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-4 py-2">
      {/* SVG Ring */}
      <div className="position-relative" style={{ width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
          {validData.map((item, idx) => {
            const val = Number(item.value) || 0;
            const sliceRatio = val / total;
            const strokeDasharray = `${sliceRatio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += sliceRatio * circumference;
            const color = item.color || CHART_COLORS[idx % CHART_COLORS.length];
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-width 0.2s ease, opacity 0.2s ease", cursor: "pointer" }}
                opacity={isHovered ? 1 : 0.88}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
        {/* Center Text */}
        <div
          className="position-absolute top-50 start-50 translate-middle text-center pointer-events-none"
          style={{ width: "80px" }}
        >
          <div className="text-muted" style={{ fontSize: "0.72rem", textTransform: "uppercase" }}>
            {hoveredIdx !== null ? validData[hoveredIdx]?.label : centerLabel}
          </div>
          <div className="fw-bold text-dark" style={{ fontSize: "1.2rem", lineHeight: 1.1 }}>
            {hoveredIdx !== null ? validData[hoveredIdx]?.value : total}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="d-flex flex-column gap-2" style={{ minWidth: "150px" }}>
        {validData.map((item, idx) => {
          const color = item.color || CHART_COLORS[idx % CHART_COLORS.length];
          const pct = Math.round((Number(item.value) / total) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="d-flex align-items-center justify-content-between p-1 rounded"
              style={{
                backgroundColor: isHovered ? "#f1f5f9" : "transparent",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "3px",
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                ></span>
                <span className="small text-secondary fw-medium">{item.label}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="small fw-bold text-dark">{item.value}</span>
                <span className="badge bg-light text-secondary border" style={{ fontSize: "0.68rem" }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Horizontal Ranked Bar Chart
 */
export function HorizontalBarChart({ data = [], valuePrefix = "", valueSuffix = "" }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-4 small">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);

  return (
    <div className="d-flex flex-column gap-3 py-1">
      {data.map((item, idx) => {
        const val = Number(item.value) || 0;
        const widthPct = Math.max(4, Math.round((val / maxValue) * 100));
        const color = item.color || CHART_COLORS[idx % CHART_COLORS.length];

        return (
          <div key={idx}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-medium text-dark text-truncate" style={{ maxWidth: "70%" }}>
                {item.label}
              </span>
              <span className="small fw-semibold text-secondary">
                {valuePrefix}
                {val.toLocaleString()}
                {valueSuffix}
              </span>
            </div>
            <div
              className="progress"
              style={{ height: "7px", backgroundColor: "#f1f5f9", borderRadius: "4px" }}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  borderRadius: "4px",
                  transition: "width 0.4s ease",
                }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

