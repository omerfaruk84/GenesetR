/**
 * One look for every material-react-table: compact rows, a bordered surface
 * without shadow, a quiet header, right-aligned numbers. Spread into the table
 * and override what a table needs:
 *
 *   <MaterialReactTable columns={columns} data={rows} {...mrtLook()} />
 *   useMaterialReactTable({ columns, data, ...mrtLook({ pageSize: 25 }) })
 *
 * Colours come from the MUI theme (utils/muiTheme.js) and the CSS tokens, so
 * the tables follow the light/dark theme.
 */
export const mrtLook = ({ pageSize = 15, maxHeight = "60vh", initialState = {} } = {}) => ({
  enableDensityToggle: false,
  enableFullScreenToggle: true,
  enableColumnResizing: false,
  enableStickyHeader: true,
  positionToolbarAlertBanner: "bottom",
  initialState: {
    density: "compact",
    showGlobalFilter: false,
    ...initialState,
    pagination: { pageIndex: 0, pageSize, ...(initialState.pagination || {}) },
  },
  muiTablePaperProps: {
    elevation: 0,
    sx: {
      border: "1px solid var(--gs-border)",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "var(--gs-surface)",
    },
  },
  muiTableContainerProps: { sx: { maxHeight } },
  muiTopToolbarProps: {
    sx: {
      minHeight: 44,
      backgroundColor: "var(--gs-surface)",
      borderBottom: "1px solid var(--gs-border)",
    },
  },
  muiBottomToolbarProps: {
    sx: {
      minHeight: 44,
      backgroundColor: "var(--gs-surface)",
      borderTop: "1px solid var(--gs-border)",
      boxShadow: "none",
    },
  },
  muiTableHeadCellProps: {
    sx: {
      backgroundColor: "var(--gs-surface-alt)",
      color: "var(--gs-muted)",
      fontSize: 12,
      fontWeight: 600,
      borderBottom: "1px solid var(--gs-border)",
      "& .Mui-TableHeadCell-Content-Wrapper": { whiteSpace: "nowrap" },
    },
  },
  muiTableBodyCellProps: {
    sx: {
      fontSize: 13,
      color: "var(--gs-text)",
      borderBottom: "1px solid var(--gs-border)",
      fontVariantNumeric: "tabular-nums",
    },
  },
  muiTableBodyRowProps: {
    sx: {
      backgroundColor: "var(--gs-surface)",
      "&:hover > td": { backgroundColor: "var(--gs-hover) !important" },
    },
  },
  muiPaginationProps: {
    rowsPerPageOptions: [10, 15, 25, 50, 100],
    showFirstButton: false,
    showLastButton: false,
  },
});

/** Column props for a numeric column: right aligned, fixed-width digits. */
export const numericColumn = {
  muiTableHeadCellProps: { align: "right" },
  muiTableBodyCellProps: { align: "right" },
};
