import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Box, Button } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlaylistAddCircleRoundedIcon from "@mui/icons-material/PlaylistAddCircleRounded";
import React from "react";
import GenelistAdd from "../genelist-add";
import { withErrorBoundary } from "../error-boundary";
import { flattenColumns } from "../../utils/geneListUtils";
import { EmptyState } from "../ui";
import { formatNumber } from "../../utils/formatNumber";
import { downloadTable } from "../../utils/exporters";
import { TableExportButtons } from "../export-buttons";
import { describe as describeDrug, entityPagePath, useDrugLabelsVersion } from "../../utils/drugLabels";

// File name for exports: genesetr_<name> (the date and extension are added on download)
const exportFilename = (exportName) =>
  `genesetr_${String(exportName || "table")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "table"}`;

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

// A symbol that has a gene page: one word, not a control guide.
const isLinkableGene = (value) =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !/^non-targeting/i.test(value);

/**
 * Columns whose values are gene symbols open the gene page (in a new tab, so
 * the result stays). A value that is a drug of a drug dataset in use opens
 * the drug page instead and shows the drug's name, dose, mechanism and
 * targets on hover. Columns with their own Cell renderer are left alone.
 */
const withGeneLinks = (columns, geneKeys) =>
  (columns || []).map((column) => {
    if (Array.isArray(column.columns)) {
      return { ...column, columns: withGeneLinks(column.columns, geneKeys) };
    }
    if (column.Cell || !geneKeys.includes(column.accessorKey)) return column;
    return {
      ...column,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        if (!isLinkableGene(value)) return value ?? "";
        const drug = describeDrug(value);
        const drugTitle = drug
          ? [
              `Open the drug page of ${drug.display}`,
              drug.moaFine || drug.moaBroad,
              drug.targets.length > 0 ? `targets ${drug.targets.join(", ")}` : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : "";
        return (
          <Link
            to={entityPagePath(value)}
            target="_blank"
            rel="noopener"
            title={drug ? drugTitle : `Open the gene page of ${value}`}
            style={{ color: "inherit", textDecorationStyle: "dotted" }}
            onClick={(event) => event.stopPropagation()}
          >
            {value}
          </Link>
        );
      },
    };
  });

// Exports hold primitive cell values only.
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
  const filename = exportFilename(exportName);
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
  const geneKeyList = geneKeys.join("\u0000");
  // Links are rebuilt when the label table of a drug dataset arrives
  const drugLabelsVersion = useDrugLabelsVersion();
  const linkedColumns = useMemo(
    () => withGeneLinks(columns, geneKeyList ? geneKeyList.split("\u0000") : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, geneKeyList, drugLabelsVersion]
  );
  // Leaf columns, in display order, for the exports.
  const exportColumns = useMemo(() => flattenColumns(columns), [columns]);

  const table = useMaterialReactTable({
    columns: linkedColumns,
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
        {/* The rows as filtered and sorted on screen (all pages) */}
        <TableExportButtons
          rows={() => toExportRows(table.getSortedRowModel().rows.map((row) => row.original))}
          columns={exportColumns}
          filename={filename}
        />

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

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    if (rowData.length === 0) return;
    downloadTable(toExportRows(rowData), {
      columns: exportColumns,
      filename: `${filename}_selected`,
      format: "csv",
    });
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
