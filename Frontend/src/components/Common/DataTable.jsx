import { useState, useMemo } from "react";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";

export default function DataTable({
  columns,
  data = [],
  loading = false,
  keyField = "id",
  searchPlaceholder = "Search records...",
  filterConfigs = [],
  actions,
  actionHeader = "Actions",
  emptyIcon = "bi-inbox",
  emptyTitle = "No records found",
  emptyDescription = "No data matches the selected criteria or no entries exist yet.",
  emptyAction,
  extraToolbar,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Handle Sort
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1);
  };

  // Filter and Sort Data
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    let result = [...data];

    // 1. Column filters
    Object.entries(filterValues).forEach(([filterKey, filterVal]) => {
      if (filterVal && filterVal !== "ALL") {
        result = result.filter((row) => {
          const rowVal = String(row[filterKey] || "").toLowerCase();
          return rowVal === String(filterVal).toLowerCase();
        });
      }
    });

    // 2. Global search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // 3. Sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Numeric compare
        if (!isNaN(valA) && !isNaN(valB)) {
          valA = Number(valA);
          valB = Number(valB);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filterValues, searchQuery, sortConfig, columns]);

  // Pagination calculation
  const totalRecords = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleFilterChange = (key, val) => {
    setFilterValues((prev) => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  return (
    <div className="erp-table-container">
      {/* Toolbar */}
      <div className="erp-table-toolbar">
        <div className="erp-search-filter-group">
          {/* Search Input */}
          <div className="erp-search-box">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Custom Filters */}
          {filterConfigs.map((cfg) => (
            <div key={cfg.key} style={{ minWidth: "150px" }}>
              <select
                className="form-select form-select-sm"
                value={filterValues[cfg.key] || "ALL"}
                onChange={(e) => handleFilterChange(cfg.key, e.target.value)}
              >
                <option value="ALL">All {cfg.label}</option>
                {cfg.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Active filters clear button */}
          {(searchQuery || Object.values(filterValues).some((v) => v && v !== "ALL")) && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setSearchQuery("");
                setFilterValues({});
                setCurrentPage(1);
              }}
              title="Reset all filters"
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
            </button>
          )}
        </div>

        {/* Action Controls & Refresh */}
        <div className="d-flex align-items-center gap-2">
          {onRefresh && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={onRefresh}
              title="Refresh data"
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise ${loading ? "spin" : ""}`}></i>
            </button>
          )}
          {extraToolbar}
        </div>
      </div>

      {/* Table Content */}
      <div className="erp-table-responsive">
        {loading ? (
          <LoadingSpinner text="Retrieving latest ERP records..." />
        ) : paginatedData.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            actionText={emptyAction?.text}
            onAction={emptyAction?.onClick}
          />
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const isSorted = sortConfig.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={col.sortable !== false ? "sortable" : ""}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      style={{ textAlign: col.align || "left" }}
                    >
                      <div className="d-flex align-items-center gap-1 justify-content-between">
                        <span>{col.label}</span>
                        {col.sortable !== false && (
                          <span className="text-muted small">
                            {isSorted ? (
                              sortConfig.direction === "asc" ? (
                                <i className="bi bi-sort-up text-primary"></i>
                              ) : (
                                <i className="bi bi-sort-down text-primary"></i>
                              )
                            ) : (
                              <i className="bi bi-arrow-down-up opacity-25"></i>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions && (
                  <th style={{ textAlign: "right", minWidth: "120px" }}>{actionHeader}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={row[keyField] || idx}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align || "left" }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && paginatedData.length > 0 && (
        <div className="erp-table-pagination">
          <div className="d-flex align-items-center gap-2">
            <span>
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalRecords)} of{" "}
              <strong>{totalRecords}</strong> entries
            </span>
            <span className="text-muted ms-2">|</span>
            <div className="d-flex align-items-center gap-1 ms-2">
              <span className="small text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm py-0"
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="d-flex align-items-center gap-1">
            <button
              className="btn btn-outline-secondary btn-sm py-1 px-2"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="px-2 small fw-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm py-1 px-2"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

