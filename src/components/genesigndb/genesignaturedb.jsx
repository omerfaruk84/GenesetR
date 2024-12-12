// src/components/GeneListSearchPopup.js
import React, { useState, useEffect, useMemo, useCallback } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Box, Rating, Typography } from "@mui/material";
import { Button } from "@oliasoft-open-source/react-ui-library";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  DialogActions,
} from "@mui/material";
import _ from "lodash";
// ... other imports

const GeneSignatureSearchPopup = ({ open, onClose, onGeneListSelect }) => {
  const [isError, setIsError] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [show, setShow] = useState(false);
  //table state
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const [geneSignatures, setGeneSignatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGeneSignature, setSelectedgeneSignature] = useState();

  const [name, setName] = useState("");
  const [genes, setGenes] = useState("");
  const [source, setSource] = useState("");
  const [nodes, setNodes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  let SERVER_ADRESS = "https://genesetr.uio.no/api";
  if (process.env.NODE_ENV !== "production") {
    console.log("WORKING IN PRODUCTION MODE");
    SERVER_ADRESS = "https://b74f-2001-700-100-400a-00-f-f95c.ngrok-free.app";
    SERVER_ADRESS = "http://localhost:8443";
  }

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);

    fetch(`${SERVER_ADRESS}/gene-signature/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        genes,
        source,
        nodes,
      }),
    })
      .then((response) => {
        response.json();
        setName("");
        setGenes("");
        setSource("");
        setNodes(0);
        setIsSubmitting(false);
        alert(
          "Thank you for your gene signature suggestion. We will add the submitted gene signature to our database after verifying it."
        );
      }) // Assuming the server responds with JSON
      .then((data) => console.log(data))
      .catch((error) => {
        console.error("Error:", error);
        setIsSubmitting(false);
      });
  }, []);

  useEffect(() => {
    //getGeneSignatures();
  }, []);

  const getGeneSignatures = useCallback(
    () => {
      // Function implementation remains the same...

      // Function to handle response or error from the debounced function
      function handleResponse(error, data) {
        if (error) {
          console.error("API call failed:", error);
          return;
        }
        console.log("API call succeeded:", data);
        data != null ? setRowCount(data.length) : setRowCount(0);
        setGeneSignatures(data);
        setIsError(false);
        setIsLoading(false);
        setIsRefetching(false);
        return data;
        // You can store the data in a variable here or perform other actions
      }

      const params = new URLSearchParams({
        //skip: pagination.pageIndex * pagination.pageSize, // Assuming you have pagination state
        //limit: pagination.pageSize,
        list_name: "", //globalFilter ?? "", // Assuming globalFilter is your search term for list_name
        //source: columnFilters.source ?? "", // Adjust according to how you manage column filters
        //sorting: sorting ?? [],
        //globalFilter: globalFilter ?? "",
        //filters: columnFilters ?? [],
      });

      const url = `${SERVER_ADRESS}/gene-signatures/?${params.toString()}`;

      // Trigger the debounced function
      debouncedFetchGeneSignatures(url, handleResponse);
    },
    [
      //pagination.pageIndex,
      //pagination.pageSize,
      //globalFilter,
      // columnFilters,
      // sorting,
    ]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Debounce the function. The debounced function returns a promise.
  const debouncedFetchGeneSignatures = _.debounce(async (url, callback) => {
    try {
      const result = await sendPostRequest(url);
      callback(null, result); // Call callback with no error and result
    } catch (error) {
      console.log(error);
      //callback(error); // Call callback with error
    }
  }, 100); // 500 ms wait time

  async function sendPostRequest(url) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const json = await response.json();
      // setData(json);
      console.log("Success:", json);
      return json;
    } catch (error) {
      setIsError(true);
      console.error("Error:", error);
      throw error;
    }
  }

  useEffect(
    () => {
      getGeneSignatures();
    },
    [
      //columnFilters, //re-fetch when column filters change
      //globalFilter, //re-fetch when global filter changes
      //pagination.pageIndex, //re-fetch when page index changes
      // pagination.pageSize, //re-fetch when page size changes
      //sorting, //re-fetch when sorting changes
      //getGeneSignatures,
    ]
  );

  //column definitions - strongly typed if you are using TypeScript (optional, but recommended)
  const columns = useMemo(
    () => [
      {
        accessorKey: "name", //simple recommended way to define a column
        header: "Gene Signature",
        muiTableHeadCellProps: { style: { color: "green" } }, //custom props
        enableHiding: false, //disable a feature for this column
        enablePinning: true,
        maxSize: 500,
        minSize: 400,
        enableColumnFilter: false,
      },

      {
        enableColumnFilter: false,
        accessorKey: "geneCount", // Using 'id' since this is a computed column, not directly an accessor for data
        Cell: ({ row }) => {
          // Assuming genes are in the format "gene1-gene2+gene3" and you want to replace all '-' with '+'
          const geneCount = row.original.genes
            .replace(/-/g, "+")
            .split("+").length;
          return <span>{geneCount}</span>;
        },
        header: "",
        enableHiding: false, //disable a feature for this column
        maxSize: 80,
        Header: () => (
          <div style={{ whiteSpace: "normal", lineHeight: "normal" }}>
            Gene
            <br />
            Count
          </div>
        ),
        enableColumnActions: false,
      },
      {
        enableColumnFilter: false,
        accessorKey: "source", //simple recommended way to define a column
        header: "Source",
        muiTableHeadCellProps: { style: { color: "green" } }, //custom props
        enableHiding: false, //disable a feature for this column
        maxSize: 500,
        minSize: 300,
      },
      {
        enableColumnFilter: false,
        accessorKey: "popularity", //simple recommended way to define a column
        header: "Popularity",
        enableHiding: false, //disable a feature for this column
        maxSize: 100,
        enableColumnActions: false,
      },
    ],
    []
  );

  //pass table options to useMaterialReactTable
  const table = useMaterialReactTable({
    columns,
    data: geneSignatures ? geneSignatures : [],
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        setSelectedgeneSignature(row.original.id);
        //getADataset(row.original.Datasetid);
      },
      onDoubleClick: () => {
        handleRowDoubleClick(row.original);
      },
    }),
    //data, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)

    enableColumnFilters: false,
    enableHiding: false,
    enableRowSelection: false, //enable some features
    enableColumnOrdering: false, //enable a feature for all columns
    enableGlobalFilter: true, //turn off a feature
    enableEditing: false,
    enableColumnFilterModes: false,
    positionGlobalFilter: "left",
    enablePagination: true,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      showGlobalFilter: true,

      density: "compact",
    },
    //layoutMode: "grid",
    // manualFiltering: true,
    //manualPagination: true,
    //manualSorting: true,
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    //onColumnFiltersChange: setColumnFilters,
    //onGlobalFilterChange: setGlobalFilter,
    //onPaginationChange: setPagination,
    //onSortingChange: setSorting,
    rowCount,
    state: {
      //columnFilters,
      //globalFilter,
      isLoading,
      pagination: { pageSize: 10, pageIndex: 0 },
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
    },
  });

  const handleRowDoubleClick = async (rowData) => {
    console.log("Clicked", rowData);
    try {
      // Update the SERVER_ADDRESS and endpoint as necessary
      const response = await axios.post(
        `${SERVER_ADRESS}/gene-signature/${rowData.id}/increase-popularity`
      );
      console.log(response.data.message);

      // Optionally refresh the list to show the updated popularity count
      getGeneSignatures();
    } catch (error) {
      console.error("Error increasing popularity:", error);
      // Handle error (e.g., show an error message)
    }
    onGeneListSelect(rowData.genes);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          minWidth: "80%", // Sets minimum width of the Paper component
        },
      }}
    >
      <DialogTitle>Search Gene Signatures</DialogTitle>
      <DialogContent sx={{ height: "70vh" }}>
        <MaterialReactTable table={table} />
        <Button
          label="Suggest New Gene List"
          variant="contained"
          onClick={() => {}}
        />

        <form onSubmit={handleSubmit}>
          <TextField
            margin="dense"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            margin="dense"
            label="Genes (comma-separated)"
            value={genes}
            onChange={(e) => setGenes(e.target.value)}
            fullWidth
            required
          />
          <TextField
            margin="dense"
            label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            fullWidth
          />
          <TextField
            margin="dense"
            label="Nodes"
            type="number"
            value={nodes}
            onChange={(e) => setNodes(e.target.value)}
            fullWidth
          />
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              Submit
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GeneSignatureSearchPopup;
