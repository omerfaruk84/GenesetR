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

const csvConfig = mkConfig({
  fieldSeparator: "\t",
  decimalSeparator: ".",
  useKeysAsHeaders: true,
});

const EnrichmentTable = ({ columns, data, onSortedDataChange, initialColumnFilters, onColumnFiltersChange }) => {
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
  
  const table = useMaterialReactTable({
    columns,
    data,
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
        <Button onClick={handleExportData} startIcon={<FileDownloadIcon />}>
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
          disabled={!table.getFilteredRowModel().rows.length > 0}
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
            !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
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
      if (onSortedDataChange && table) {
        const sortedRows = table.getSortedRowModel().rows;
        const sortedData = sortedRows.map(row => row.original);
        onSortedDataChange(sortedData);
      }
    }, 1000); // 1 second debounce
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sorting, columnFilters, globalFilter, data, onSortedDataChange]);

  const handleExportData = () => {
    const csv = generateCsv(csvConfig)(data);
    download(csvConfig)(csv);
  };

  const handleExportRows = (rows) => {
    const rowData = rows.map((row) => row.original);
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  const handleSaveGeneList = (rows) => {
    const rowData = rows.map((row) => row.original);
    let genesString = rowData.map((obj) => obj["Gene"]).join(",");
    genesString +=
      "," + rowData.map((obj) => obj["Gene Symbol From"]).join(",");
    genesString += "," + rowData.map((obj) => obj["Gene Symbol To"]).join(",");
    genesString = genesString
      .replaceAll(",,", ",")
      .replaceAll(",,", ",")
      .replaceAll(",,", ",");

    if (genesString.length > 2) {
      setgenesToSave(genesString);
      setNewListVisible(true);
    }
  };

  /*
  const exportData = () => {
    // Convert data to a tab-separated string
    const csvData = keyedData
      .map((item) => Object.values(item).join("\t"))
      .join("\n");

    // Create a blob with the data
    const blob = new Blob([csvData], { type: "text/plain;charset=utf-8" });

    // Save the blob as a file using FileSaver.js
    saveAs(blob, "data.tsv");
  };
  */

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
export default EnrichmentTable;
