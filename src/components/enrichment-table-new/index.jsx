import { useMemo, useEffect, useState } from "react";
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

const EnrichmentTable = ({ columns, data }) => {
  const [newListVisible, setNewListVisible] = useState(false);
  const [genesToSave, setgenesToSave] = useState("");
  const table = useMaterialReactTable({
    columns,
    data,
    enableRowSelection: true,
    enableStickyHeader: true,
    //enableColumnResizing: true,
    enableDensityToggle: false,
    enableFacetedValues: true,
    displayColumnDefOptions: {
      "mrt-row-select": {
        enableColumnActions: true,
        enableHiding: true,
        size: "20px",
        maxSize: "40px",
        p: 5,
      },
    },
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
          Export All Data
        </Button>

        <Button
          disabled={
            !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
          }
          onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
          startIcon={<FileDownloadIcon />}
        >
          Export Selected Rows
        </Button>
        <Button
          disabled={
            !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
          }
          onClick={() => handleSaveGeneList(table.getSelectedRowModel().rows)}
          startIcon={<PlaylistAddCircleRoundedIcon />}
        >
          Create Genelist From Selected
        </Button>
      </Box>
    ),
  });

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
