// src/components/GeneListSearchPopup.js
import React, { useState, useEffect, useMemo, useCallback } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { 
  Box, 
  Rating, 
  Typography, 
  Chip,
  Divider,
  Button
} from "@mui/material";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  DialogActions,
  Alert,
  Snackbar,
} from "@mui/material";
import _ from "lodash";
// ... other imports

const isDevEnv = process.env.NODE_ENV !== "production";
const debugLog = (...args) => {
  if (isDevEnv) {
    console.log(...args);
  }
};
const debugError = (...args) => {
  if (isDevEnv) {
    console.error(...args);
  }
};

// Use centralized server address configuration (matches frontend/src/store/api/index.js)
let SERVER_ADRESS = "https://genesetr.uio.no/api";
if (isDevEnv) {
  SERVER_ADRESS = "http://localhost:8443";
  debugLog("WORKING IN DEVELOPMENT MODE");
}

const GeneSignatureSearchPopup = ({ open, onClose, onGeneListSelect, onSelectAndCalculate }) => {
  const [isError, setIsError] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  
  //table state
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  const [geneSignatures, setGeneSignatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGeneSignature, setSelectedGeneSignature] = useState(null);

  // Form state for suggesting new gene signatures
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [name, setName] = useState("");
  const [genes, setGenes] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });

  // Process gene input to handle different formats (+ - comma ; newline)
  const processGeneInput = (input) => {
    return input
      .replace(/[+\-,;\n\r]/g, ';') // Replace all separators with semicolon
      .split(';')
      .map(gene => gene.trim())
      .filter(gene => gene.length > 0)
      .join(';');
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const processedGenes = processGeneInput(genes);
      
      debugLog(`Submitting gene signature to: ${SERVER_ADRESS}/gene-signature/`);
      const response = await fetch(`${SERVER_ADRESS}/gene-signature/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "69420", // Add ngrok header for consistency
        },
        body: JSON.stringify({
          name: name.trim(),
          genes: processedGenes,
          source: source.trim(),
          notes: notes.trim(),
        }),
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      // Success - response is ok
      const responseData = await response.json();
      setName("");
      setGenes("");
      setSource("");
      setNotes("");
      setShowSuggestionForm(false);
      setNotification({
        open: true,
        message: "Thank you for your gene signature suggestion! We will review and add it to our database.",
        severity: "success"
      });
      getGeneSignatures(); // Refresh the list
    } catch (error) {
      debugError("Error:", error);
      setNotification({
        open: true,
        message: `Error submitting gene signature: ${error.message}. Please make sure the backend server is running.`,
        severity: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, genes, source, notes, SERVER_ADRESS]);

  const handleCancelSuggestion = () => {
    // Reset form and go back to main view
    setName("");
    setGenes("");
    setSource("");
    setNotes("");
    setShowSuggestionForm(false);
  };

  const getGeneSignatures = useCallback(() => {
    function handleResponse(error, data) {
      if (error) {
        debugError("API call failed:", error);
        setIsError(true);
        setNotification({
          open: true,
          message: "Failed to load gene signatures. Please check if the backend server is running.",
          severity: "error"
        });
        return;
      }
      debugLog("API call succeeded:", data);
      data != null ? setRowCount(data.length) : setRowCount(0);
      setGeneSignatures(data);
      setIsError(false);
      setIsLoading(false);
      setIsRefetching(false);
    }

    const params = new URLSearchParams({
      list_name: globalFilter ?? "",
    });

    const url = `${SERVER_ADRESS}/gene-signatures/?${params.toString()}`;
    debouncedFetchGeneSignatures(url, handleResponse);
  }, [globalFilter, SERVER_ADRESS]);

  const debouncedFetchGeneSignatures = _.debounce(async (url, callback) => {
    try {
      setIsLoading(true);
      const result = await sendGetRequest(url);
      callback(null, result);
    } catch (error) {
      debugError(error);
      callback(error);
    }
  }, 300);

  async function sendGetRequest(url) {
    try {
      debugLog(`Making request to: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "69420", // Add ngrok header for consistency
        },
      });
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const json = await response.json();
      debugLog("Success:", json);
      setIsError(false); // Clear error on success
      return json;
    } catch (error) {
      setIsError(true);
      debugError("API call failed:", error);
      debugError("Request URL:", url);
      
      // More specific error messages
      if (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
        const errorMsg = `Cannot connect to server at ${SERVER_ADRESS}.\n\n` +
          `Please ensure:\n` +
          `1. The backend server is running (python API/main.py or uvicorn main:app --port 8443)\n` +
          `2. Redis is running (redis-server)\n` +
          `3. Celery worker is running (celery -A tasks.celery worker)\n` +
          `4. The server is accessible at ${SERVER_ADRESS}`;
        throw new Error(errorMsg);
      }
      // Re-throw with more context
      if (error.message && !error.message.includes('Cannot connect')) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  useEffect(() => {
    if (open) {
      getGeneSignatures();
    }
  }, [open, getGeneSignatures]);

  useEffect(() => {
    getGeneSignatures();
  }, [globalFilter]);

  const handleRowClick = (row) => {
    setSelectedGeneSignature(row.original);
  };

  const handleSelect = async () => {
    if (!selectedGeneSignature) return;
    
    try {
      // Increase popularity when selected
      await axios.post(
        `${SERVER_ADRESS}/gene-signature/${selectedGeneSignature.id}/increase-popularity`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "ngrok-skip-browser-warning": "69420", // Add ngrok header for consistency
          }
        }
      );
      
      // Pass the gene list to parent component
      onGeneListSelect(selectedGeneSignature.genes);
      
      // Trigger auto-calculation if callback is provided
      if (onSelectAndCalculate) {
        onSelectAndCalculate();
      }
      
      onClose();
    } catch (error) {
      debugError("Error increasing popularity:", error);
      setNotification({
        open: true,
        message: "Error selecting gene signature. Please try again.",
        severity: "error"
      });
    }
  };

  //column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Gene Signature",
        muiTableHeadCellProps: { style: { color: "green" } },
        enableHiding: false,
        enablePinning: true,
        maxSize: 300,
        minSize: 200,
        enableColumnFilter: false,
      },
      {
        enableColumnFilter: false,
        accessorKey: "geneCount",
        Cell: ({ row }) => {
          // Handle all possible gene separator formats that might exist in the database
          const genesString = row.original.genes || "";
          const geneCount = genesString
            ? genesString
                .replace(/[+\-,;\n\r\t]/g, ';') // Replace all separators with semicolon
                .split(';')
                .map(gene => gene.trim())
                .filter(gene => gene.length > 0).length
            : 0;
          return (
            <Box display="flex" justifyContent="center" alignItems="center" width="100%">
              <Chip label={geneCount} size="small" color="primary" />
            </Box>
          );
        },         
        header: "Genes",
        enableHiding: false,
        maxSize: 80,
        minSize: 50,
        size: 50,
        enableColumnActions: false,
        muiTableBodyCellProps: {
          align: 'center'
        }
      },
      {
        enableColumnFilter: false,
        accessorKey: "source",
        header: "Source",
        muiTableHeadCellProps: { style: { color: "green" } },
        enableHiding: false,
        maxSize: 250,
        minSize: 120,
        size:150,
        Cell: ({ cell }) => (
          <Typography variant="body2" noWrap title={cell.getValue()}>
            {cell.getValue() || "N/A"}
          </Typography>
        ),
      },
      {
        enableColumnFilter: false,
        accessorKey: "popularity",
        header: "Popularity",
        enableHiding: false,
        maxSize: 100,
        minSize: 60,
        size:60,
        enableColumnActions: false,
        Cell: ({ cell }) => (
          <Chip label={cell.getValue() || 0} size="small" variant="outlined" />
        ),
      },
      {
        enableColumnFilter: false,
        accessorKey: "notes",
        header: "Notes",
        enableHiding: false,
        maxSize: 200,
        minSize: 100,
        Cell: ({ cell }) => (
          <Typography variant="body2" noWrap title={cell.getValue()}>
            {cell.getValue() || ""}
          </Typography>
        ),
      },      
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: geneSignatures || [],
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => handleRowClick(row),
      sx: {
        cursor: 'pointer',
        backgroundColor: selectedGeneSignature?.id === row.original.id ? '#e3f2fd' : 'inherit',
        '&:hover': {
          backgroundColor: selectedGeneSignature?.id === row.original.id ? '#bbdefb' : '#f5f5f5',
        },
      },
    }),
    enableColumnFilters: false,
    enableHiding: false,
    enableRowSelection: false,
    enableColumnOrdering: false,
    enableGlobalFilter: true,
    enableEditing: false,
    enableColumnFilterModes: false,
    positionGlobalFilter: "left",
    // Virtualization settings
    enablePagination: false, // Disable pagination
    enableRowVirtualization: true, // Enable row virtualization
    muiTableContainerProps: {
      sx: {
        height: '100%', // Fill 100% of available space
        flex: 1, // Take up remaining space
        minHeight: 0, // Allow flexbox to shrink
      },
    },
    initialState: {
      showGlobalFilter: true,
      density: "compact",
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data - please check if the backend server is running",
        }
      : undefined,
    onGlobalFilterChange: setGlobalFilter,
    rowCount: geneSignatures?.length || 0,
    state: {
      globalFilter,
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
    },
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "72vh",
            maxHeight: "72vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">
                {showSuggestionForm ? "Suggest New Gene Signature" : "Gene Signatures"}
              </Typography>
              {selectedGeneSignature && !showSuggestionForm && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Selected: <strong>{selectedGeneSignature.name}</strong>
                </Typography>
              )}
            </Box>
            {!showSuggestionForm && (
              <Button
                variant="contained"
                onClick={() => setShowSuggestionForm(true)}
                sx={{ 
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  },
                  color: 'white'
                }}
                size="small"
              >
                Suggest Gene Signature
              </Button>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pb: 1, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {showSuggestionForm ? (
            // Suggestion Form View
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                size="small"
              />
              
              <TextField
                label="Genes *"
                value={genes}
                onChange={(e) => setGenes(e.target.value)}
                fullWidth
                required
                multiline
                rows={4}
                variant="outlined"
                size="small"
                helperText="Enter genes separated by +, -, comma, semicolon, or new lines"
              />
              
              <TextField
                label="Source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                helperText="e.g., PubMed ID, DOI, URL, or paper citation"
              />
              
              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                size="small"
                helperText="Additional information about this gene signature"
              />
            </Box>
          ) : (
            // Main Table View
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <MaterialReactTable table={table} />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          {showSuggestionForm ? (
            // Suggestion Form Actions
            <>
              <Button onClick={handleCancelSuggestion} variant="outlined">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                variant="contained" 
                disabled={isSubmitting || !name.trim() || !genes.trim()}
                color="primary"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          ) : (
            // Main View Actions
            <>
              <Button onClick={onClose} variant="outlined">
                Cancel
              </Button>
              <Button 
                onClick={handleSelect} 
                variant="contained" 
                disabled={!selectedGeneSignature}
                color="primary"
              >
                Select
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GeneSignatureSearchPopup;
