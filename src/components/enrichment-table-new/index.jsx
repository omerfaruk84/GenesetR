import { useState, useEffect, useRef } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Box, Button } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlaylistAddCircleRoundedIcon from "@mui/icons-material/PlaylistAddCircleRounded";
import { mkConfig, generateCsv, download } from "export-to-csv";
import React from "react";
import GenelistAdd from "../genelist-add";
import { withErrorBoundary } from "../error-boundary";
import { flattenColumns } from "../../utils/geneListUtils";
import { EmptyState } from "../ui";
import { formatNumber } from "../../utils/formatNumber";

// File name for exports: genesetr_<name>_<yyyy-mm-dd>.csv
const csvConfigFor = (exportName) =>
  mkConfig({
    fieldSeparator: "\t",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
    filename: `genesetr_${String(exportName || "table")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "table"}_${new Date().toISOString().slice(0, 10)}`,
  });

// Numbers without a column-specific renderer get one consistent format.
const DEFAULT_COLUMN = {
  Cell: ({ cell }) => {
    const value = cell.getValue();
    return typeof value === "number" ? formatNumber(value) : value ?? "";
  },
};

// Accessor keys / headers that hold gene symbols in the result tables.
// "gene", "Gene", "Gene 1", "Gene Symbol From", "From", "To", "Perturbation", ...
const GENE_KEY_PATTERN =
  /^(gene(\s*symbol)?(\s*(\d+|from|to))?|gene\/perturbation|perturbation|from|to|symbol)$/i;

const isGeneLikeKey = (value) =>
  typeof value === "string" && GENE_KEY_PATTERN.test(value.trim());

/**
 * Which row keys hold gene symbols.
 * 1) explicit `geneAccessors` prop, 2) columns whose accessorKey or header looks
 * like a gene column, 3) gene-like keys of the first row.
 */
export const resolveGeneAccessors = (geneAccessors, columns, data) => {
  if (Array.isArray(geneAccessors) && geneAccessors.length > 0) {
    return geneAccessors.filter((key) => typeof key === "string" && key);
  }
  if (typeof geneAccessors === "string" && geneAccessors) return [geneAccessors];

  const fromColumns = flattenColumns(columns)
    .filter(
      (col) =>
        typeof col?.accessorKey === "string" &&
        (isGeneLikeKey(col.accessorKey) || isGeneLikeKey(col.header))
    )
    .map((col) => col.accessorKey);
  if (fromColumns.length > 0) return Array.from(new Set(fromColumns));

  const firstRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return firstRow ? Object.keys(firstRow).filter(isGeneLikeKey) : [];
};

/** Unique gene symbols of the given rows, in first-seen order. */
export const collectGenes = (rows, accessors) => {
  const seen = new Set();
  const genes = [];
  (accessors || []).forEach((key) => {
    (rows || []).forEach((row) => {
      const value = row?.[key];
      if (value === null || value === undefined) return;
      const gene = String(value).trim();
      if (!gene || seen.has(gene)) return;
      seen.add(gene);
      genes.push(gene);
    });
  });
  return genes;
};

// export-to-csv only accepts primitive cell values.
const toExportRows = (rows) =>
  (rows || []).map((row) => {
    const out = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) out[key] = "";
      else if (Array.isArray(value)) out[key] = value.join(", ");
      else if (typeof value === "object") out[key] = JSON.stringify(value);
      else out[key] = value;
    });
    return out;
  });

const EnrichmentTable = ({
  columns,
  data,
  onSortedDataChange,
  initialColumnFilters,
  onColumnFiltersChange,
  geneAccessors,
  exportName,
}) => {
  const csvConfig = csvConfigFor(exportName);
  const [newListVisible, setNewListVisible] = useState(false);
  const [genesToSave, setgenesToSave] = useState("");
  const [sorting, setSorting] = useState([]);
  const isControlledFilters = Array.isArray(initialColumnFilters) && typeof onColumnFiltersChange === "function";
  const [uncontrolledColumnFilters, setUncontrolledColumnFilters] = useState(initialColumnFilters || []);
  const columnFilters = isControlledFilters ? initialColumnFilters : uncontrolledColumnFilters;
  const [globalFilter, setGlobalFilter] = useState('');
  const debounceTimerRef = useRef(null);
  const prevInitialFiltersRef = useRef(JSON.stringify(initialColumnFilters || []));
  const isInitializingRef = useRef(true);
  // Latest callback, so an inline handler passed by a parent does not restart
  // the debounce on every parent render.
  const onSortedDataChangeRef = useRef(onSortedDataChange);
  onSortedDataChangeRef.current = onSortedDataChange;

  useEffect(() => {
    isInitializingRef.current = false;
  }, []);

  // Update filters when initialColumnFilters prop changes (for external control)
  useEffect(() => {
    if (isControlledFilters) return;
    if (initialColumnFilters !== undefined) {
      const newFilterStr = JSON.stringify(initialColumnFilters);
      const prevFilterStr = prevInitialFiltersRef.current;

      if (newFilterStr !== prevFilterStr) {
        prevInitialFiltersRef.current = newFilterStr;
        setUncontrolledColumnFilters(initialColumnFilters || []);
      }
    }
  }, [initialColumnFilters, isControlledFilters]);

  // Notify parent of filter changes
  const handleColumnFiltersChange = (updater) => {
    if (isControlledFilters) {
      const next = typeof updater === "function" ? updater(columnFilters) : updater;
      if (!isInitializingRef.current) {
        onColumnFiltersChange(next);
      }
      return;
    }

    setUncontrolledColumnFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!isInitializingRef.current) {
        onColumnFiltersChange?.(next);
      }
      return next;
    });
  };

  const geneKeys = resolveGeneAccessors(geneAccessors, columns, data);
  const canCreateGenelist = geneKeys.length > 0;

  const table = useMaterialReactTable({
    columns,
    data,
    defaultColumn: DEFAULT_COLUMN,
    renderEmptyRowsFallback: () =>
      Array.isArray(data) && data.length > 0 ? (
        <EmptyState
          title="No rows match the current filters"
          hint="Clear the search box or the column filters to see all rows again."
        />
      ) : (
        <EmptyState
          title="No results to show"
          hint="The analysis returned no rows for the current settings."
        />
      ),
    enableRowSelection: true,
    enableStickyHeader: true,
    //enableColumnResizing: true,
    enableDensityToggle: false,
    enableFacetedValues: true,
    enableColumnActions: false, // Disable three dots menu on all columns
    displayColumnDefOptions: {
      "mrt-row-select": {
        enableColumnActions: false,
        enableHiding: true,
        size: "20px",
        maxSize: "40px",
        p: 5,
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      density: "compact",
      showColumnFilters: true,
      showGlobalFilter: true,
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
    muiSelectCheckboxProps: {
      sx: {
        width: "20px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        p: "0px 8px",
        height: "10px",
      },
    },
    muiTableProps: {
      sx: {
        p: "0px 16px",
        height: "10px",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        height: "10px",
      },
    },

    muiSearchTextFieldProps: {
      size: "small",
      variant: "outlined",
    },
    muiTablePaperProps: {
      sx: {
        m: "auto",
        maxWidth: "100%",
      },
    },
    // Custom styling to conditionally hide filters on grouped header cells
    muiTableHeadCellFilterTextFieldProps: ({ column }) => {
      // Hide filter if this is a grouped column (has children columns)
      if (column.columns && column.columns.length > 0) {
        return {
          sx: {
            display: 'none !important',
          },
        };
      }
      return {};
    },
    muiTableHeadCellFilterSliderProps: ({ column }) => {
      // Hide filter slider if this is a grouped column
      if (column.columns && column.columns.length > 0) {
        return {
          sx: {
            display: 'none !important',
          },
        };
      }
      return {};
    },
    //columnFilterDisplayMode: "popover",
    paginationDisplayMode: "pages",
    positionToolbarAlertBanner: "bottom",
    renderTopToolbarCustomActions: ({ table }) => (
      <Box
        sx={{
          display: "flex",
          gap: "16px",
          padding: "8px",
          flexWrap: "wrap",
        }}
      >
        <Button
          disabled={!Array.isArray(data) || data.length === 0}
          onClick={handleExportData}
          startIcon={<FileDownloadIcon />}
        >
          Export
        </Button>

        <Button
          disabled={
            !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
          }
          onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
          startIcon={<FileDownloadIcon />}
        >
          Export Selected
        </Button>
        <Button
          disabled={!canCreateGenelist || !(table.getFilteredRowModel().rows.length > 0)}
          onClick={() => {
            handleSaveGeneList(table.getFilteredRowModel().rows);
            table.resetRowSelection();
          }}
          startIcon={<PlaylistAddCircleRoundedIcon />}
        >
          Create Genelist
        </Button>
        <Button
          disabled={
            !canCreateGenelist ||
            (!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected())
          }
          onClick={() => {
            handleSaveGeneList(table.getSelectedRowModel().rows);
            table.resetRowSelection();
          }}
          startIcon={<PlaylistAddCircleRoundedIcon />}
        >
          Create Genelist From Selected
        </Button>
      </Box>
    ),
  });

  // Debounced effect to notify parent of sorted/filtered data changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const notify = onSortedDataChangeRef.current;
      if (typeof notify === "function" && table) {
        const sortedRows = table.getSortedRowModel().rows;
        const sortedData = sortedRows.map(row => row.original);
        notify(sortedData);
      }
    }, 1000); // 1 second debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting, columnFilters, globalFilter, data]);

  const handleExportData = () => {
    if (!Array.isArray(data) || data.length === 0) return;
    const csv = generateCsv(csvConfig)(toExportRows(data));
    download(csvConfig)(csv);
  };

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    if (rowData.length === 0) return;
    const csv = generateCsv(csvConfig)(toExportRows(rowData));
    download(csvConfig)(csv);
  };

  const handleSaveGeneList = (rows) => {
    const rowData = rows.map((row) => row.original);
    const genes = collectGenes(rowData, geneKeys);

    if (genes.length > 0) {
      setgenesToSave(genes.join(","));
      setNewListVisible(true);
    }
  };

  return (
    <>
      <MaterialReactTable table={table} />

      {newListVisible && (
        <GenelistAdd
          genes={genesToSave}
          setNewListVisible={setNewListVisible}
        />
      )}
    </>
  );
};

export default withErrorBoundary(EnrichmentTable, { label: "Table" });
