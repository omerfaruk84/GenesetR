import React, { useState, useMemo } from "react";
import { connect } from "react-redux";
import {
  Field,
  Select,
  Button,
  Text,
} from "@oliasoft-open-source/react-ui-library";
import {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_ColumnDef,
} from "material-react-table";
import { precomputedDrSettingsChanged } from "../../../store/settings/precomputed-dr-settings";
import { coreSettingsChanged } from "../../../store/settings/core-settings";
import { PrecomputedDrSettingsTypes, CoreSettingsTypes } from "./enums";
import { fetchPrecomputedDR, listPrecomputedDR, getData } from "../../../store/api";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { resultReceived } from "../../../store/results";

const PrecomputedDrSettings = ({
  precomputedDrSettings,
  precomputedDrSettingsChanged,
  coreSettings,
  coreSettingsChanged,
  dispatch,
}) => {
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [availableResults, setAvailableResults] = useState([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [loadingResults, setLoadingResults] = useState(false);
  const [userEditing, setUserEditing] = useState(false); // Flag to prevent auto-updates during manual editing
  
  // Define table columns (must be at top level - Rules of Hooks)
  const columns = useMemo(() => [
    {
      accessorKey: "computation_date",
      header: "Date",
      size: 120,
      Cell: ({ cell }) => {
        const date = cell.getValue();
        if (!date) return "N/A";
        try {
          return new Date(date).toLocaleString();
        } catch {
          return date;
        }
      },
    },
    {
      accessorKey: "method",
      header: "Method",
      size: 100,
    },
    {
      accessorKey: "hvg_strategy",
      header: "HVG Strategy",
      size: 100,
    },
    {
      accessorKey: "n_hvgs",
      header: "N HVGs",
      size: 80,
    },
    {
      accessorKey: "cell_lines",
      header: "Cell Lines",
      size: 150,
      Cell: ({ cell }) => {
        const lines = cell.getValue();
        return Array.isArray(lines) ? lines.join(", ") : (lines || "N/A");
      },
    },
    {
      accessorKey: "cluster_count",
      header: "Clusters",
      size: 80,
    },
    {
      accessorKey: "total_perturbations",
      header: "Perturbations",
      size: 100,
    },
  ], []);

  // Table configuration (must be at top level - Rules of Hooks)
  const table = useMaterialReactTable({
    columns,
    data: availableResults,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === "function" ? updater({}) : updater;
      const selectedRowIds = Object.keys(newSelection).filter(key => newSelection[key]);
      if (selectedRowIds.length > 0) {
        const rowIndex = parseInt(selectedRowIds[0]);
        setSelectedResultIndex(rowIndex);
        // Update settings from result inline to avoid forward reference
        if (!userEditing && availableResults[rowIndex]) {
          const result = availableResults[rowIndex];
          if (result && result.method && result.hvg_strategy && result.n_hvgs && result.cell_lines) {
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.DR_METHOD,
              newValue: result.method,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.HVG_STRATEGY,
              newValue: result.hvg_strategy,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.N_HVGS,
              newValue: result.n_hvgs,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.SELECTED_CELL_LINES,
              newValue: result.cell_lines,
            });
          }
        }
      }
    },
    state: {
      rowSelection: selectedResultIndex >= 0 ? { [selectedResultIndex]: true } : {},
    },
    initialState: {
      sorting: [{ id: "computation_date", desc: true }], // Sort by date descending (newest first)
    },
    enableStickyHeader: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    muiTableContainerProps: {
      sx: { maxHeight: "300px" },
    },
    muiTableBodyRowProps: ({ row }) => {
      // Define updateSettingsFromResult inline to avoid forward reference
      const handleRowClick = () => {
        const rowIndex = row.index;
        setSelectedResultIndex(rowIndex);
        // Update settings from result
        if (!userEditing && availableResults[rowIndex]) {
          const result = availableResults[rowIndex];
          if (result && result.method && result.hvg_strategy && result.n_hvgs && result.cell_lines) {
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.DR_METHOD,
              newValue: result.method,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.HVG_STRATEGY,
              newValue: result.hvg_strategy,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.N_HVGS,
              newValue: result.n_hvgs,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.SELECTED_CELL_LINES,
              newValue: result.cell_lines,
            });
          }
        }
      };
      return {
        onClick: handleRowClick,
        sx: {
          cursor: "pointer",
          backgroundColor: row.index === selectedResultIndex ? "#e3f2fd" : undefined,
          "&:hover": {
            backgroundColor: row.index === selectedResultIndex ? "#e3f2fd" : "#f5f5f5",
          },
        },
      };
    },
  });
  
  // Debug: Log state changes
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("PrecomputedDrSettings state:", { 
        loading, 
        computing, 
        loadingResults,
        availableResultsCount: availableResults.length,
        selectedResultIndex,
        settingsDisabled: computing || loading,
        userEditing,
        reduxState: precomputedDrSettings
      });
    }
  }, [loading, computing, loadingResults, availableResults.length, selectedResultIndex, userEditing, precomputedDrSettings]);
  
  // Force reset loading/computing states if they get stuck
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !computing) {
        console.warn("Loading state stuck, resetting...");
        setLoading(false);
      }
      if (computing && !loading) {
        console.warn("Computing state stuck, resetting...");
        setComputing(false);
      }
    }, 30000); // Reset after 30 seconds if stuck
    
    return () => clearTimeout(timeout);
  }, [loading, computing]);

  // Load available results on mount
  React.useEffect(() => {
    const loadAvailableResults = async () => {
      setLoadingResults(true);
      try {
        console.log("Loading available results on mount...");
        const results = await listPrecomputedDR();
        console.log("Loaded results:", results.length);
        setAvailableResults(results || []);
        if (results && results.length > 0) {
          setSelectedResultIndex(0);
          // Auto-populate settings from first result
          const firstResult = results[0];
          if (firstResult.method && firstResult.hvg_strategy && firstResult.n_hvgs && firstResult.cell_lines) {
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.DR_METHOD,
              newValue: firstResult.method,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.HVG_STRATEGY,
              newValue: firstResult.hvg_strategy,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.N_HVGS,
              newValue: firstResult.n_hvgs,
            });
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.SELECTED_CELL_LINES,
              newValue: firstResult.cell_lines,
            });
          }
        }
      } catch (error) {
        console.error("Error loading available results:", error);
      } finally {
        setLoadingResults(false);
      }
    };
    loadAvailableResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Debug logging
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("PrecomputedDrSettings rendered", {
        precomputedDrSettings,
        coreSettings: coreSettings?.datasetList?.length,
        wholeGenomeCount: coreSettings?.datasetList?.filter(d => d.isWholeGenome)?.length
      });
    }
  }, [precomputedDrSettings, coreSettings]);

  const hvgStrategyOptions = [
    { label: "Union", value: "union" },
    { label: "Intersection", value: "intersection" },
  ];

  const drMethodOptions = [
    { label: "PCA+MDE", value: "PCA+MDE" },
    { label: "UMAP", value: "UMAP" },
    { label: "t-SNE", value: "tSNE" },
  ];

  const colorByOptions = [
    { label: "Cell Line", value: "cellLine" },
    { label: "Cluster", value: "cluster" },
  ];

  // Get available whole genome datasets
  const wholeGenomeDatasets = coreSettings?.datasetList?.filter(
    (dataset) => dataset.isWholeGenome
  ) || [];

  const cellLineOptions = wholeGenomeDatasets.map((dataset) => ({
    label: dataset.name,
    value: dataset.id,
  }));

  // If no whole genome datasets available, show a message
  if (wholeGenomeDatasets.length === 0) {
    return (
      <div style={{ padding: "16px", color: "#666" }}>
        <Text size="small">
          No whole genome datasets available. Please ensure whole genome datasets are loaded.
        </Text>
      </div>
    );
  }

  // Compute new pre-computed data
  const handleComputeData = async () => {
    if (!precomputedDrSettings.selectedCellLines || precomputedDrSettings.selectedCellLines.length === 0) {
      toast({
        message: {
          type: "Error",
          icon: true,
          content: "Please select at least one cell line",
        },
      });
      return;
    }

    setComputing(true);
    try {
      // Debug: Log current settings before creating payload
      console.log("[FRONTEND] Precomputed DR Settings before compute:", {
        useBatchCorrection: precomputedDrSettings.useBatchCorrection,
        concatenationMode: precomputedDrSettings.concatenationMode,
        batchCorrectionTheta: precomputedDrSettings.batchCorrectionTheta,
        batchCorrectionMaxIter: precomputedDrSettings.batchCorrectionMaxIter,
      });
      
      const useBatchCorrectionValue = precomputedDrSettings.useBatchCorrection === true && precomputedDrSettings.concatenationMode === "samples";
      console.log("[FRONTEND] Computed use_batch_correction value:", useBatchCorrectionValue);
      
      const payload = {
        cell_lines: precomputedDrSettings.selectedCellLines,
        hvg_strategy: precomputedDrSettings.hvgStrategy,
        n_hvgs: precomputedDrSettings.nHvgs,
        dr_method: precomputedDrSettings.drMethod,
        concatenation_mode: precomputedDrSettings.concatenationMode || "samples",
        n_top_gene_celllines: precomputedDrSettings.nTopGeneCelllines || 6000,
        use_common_perturbations: precomputedDrSettings.useCommonPerturbations !== false, // Default to True
        use_batch_correction: useBatchCorrectionValue, // Only for samples mode
        batch_correction_params: {
          theta: precomputedDrSettings.batchCorrectionTheta || 1.0,
          max_iter_harmony: precomputedDrSettings.batchCorrectionMaxIter || 10,
        },
        dr_params: {}, // Use defaults
        clustering_params: {
          min_cluster_size: 5,
          clusteringMetric: "euclidean",
          clusteringMethod: "eom"
        },
        datasetType: "pert",
        processtype: "data"
      };

      const result = await getData({
        request: "calculatePrecomputedDR",
        ...payload
      });

      console.log("Pre-computation result:", result);

      // The task returns a dict with file_path, filename, metadata, etc.
      // Check if result exists and has file_path or if it's the actual data
      if (result) {
        if (result.file_path || result.filename) {
          // Task completed successfully with file info
          toast({
            message: {
              type: "Success",
              icon: true,
              content: "Pre-computation completed! Loading results...",
            },
          });
          // Reload available results
          const results = await listPrecomputedDR();
          // Sort by computation date (newest first) to find the latest result
          const sortedResults = (results || []).sort((a, b) => {
            const dateA = a.computation_date ? new Date(a.computation_date) : new Date(a.modified || 0);
            const dateB = b.computation_date ? new Date(b.computation_date) : new Date(b.modified || 0);
            return dateB - dateA; // Descending order (newest first)
          });
          setAvailableResults(sortedResults);
          if (sortedResults && sortedResults.length > 0) {
            // Select the newest result (first in sorted list)
            setSelectedResultIndex(0);
            updateSettingsFromResult(sortedResults[0]);
            
            // Automatically load the newly computed result
            const newResult = sortedResults[0];
            if (newResult && newResult.filename) {
              setLoading(true);
              try {
                const data = await fetchPrecomputedDR({ filename: newResult.filename });
                if (data) {
                  dispatch(resultReceived({
                    result: data,
                    module: "precomputedDrGraph"
                  }));
                  toast({
                    message: {
                      type: "Success",
                      icon: true,
                      content: "New result computed and loaded successfully!",
                    },
                  });
                } else {
                  toast({
                    message: {
                      type: "Warning",
                      icon: true,
                      content: "Result computed but could not be loaded. Please try 'Load Selected Result'.",
                    },
                  });
                }
              } catch (error) {
                console.error("Error auto-loading computed result:", error);
                toast({
                  message: {
                    type: "Warning",
                    icon: true,
                    content: "Result computed but could not be auto-loaded. Please try 'Load Selected Result'.",
                    details: error.message || "Unknown error",
                  },
                });
              } finally {
                setLoading(false);
              }
            }
          }
        } else if (result.PC1 || result.GeneSymbols) {
          // Task returned the actual graph data directly
          toast({
            message: {
              type: "Success",
              icon: true,
              content: "Pre-computation completed! Data loaded.",
            },
          });
          // Store in results store
          dispatch(resultReceived({
            result: result,
            module: "precomputedDrGraph"
          }));
          // Reload available results
          const results = await listPrecomputedDR();
          // Sort by computation date (newest first)
          const sortedResults = (results || []).sort((a, b) => {
            const dateA = a.computation_date ? new Date(a.computation_date) : new Date(a.modified || 0);
            const dateB = b.computation_date ? new Date(b.computation_date) : new Date(b.modified || 0);
            return dateB - dateA; // Descending order (newest first)
          });
          setAvailableResults(sortedResults);
          if (sortedResults && sortedResults.length > 0) {
            // Select the newest result (first in sorted list)
            setSelectedResultIndex(0);
            updateSettingsFromResult(sortedResults[0]);
          }
        } else {
          // Unknown result format
          console.warn("Unexpected result format:", result);
          toast({
            message: {
              type: "Error",
              icon: true,
              content: "Pre-computation completed but result format is unexpected",
              details: JSON.stringify(result).substring(0, 100),
            },
          });
        }
      } else {
        toast({
          message: {
            type: "Error",
            icon: true,
            content: "Pre-computation completed but no result was returned",
          },
        });
      }
    } catch (error) {
      console.error("Error computing pre-computed DR:", error);
      toast({
        message: {
          type: "Error",
          icon: true,
          content: "Error computing data",
          details: error.message || "Unknown error",
        },
      });
    } finally {
      setComputing(false);
    }
  };

  // Load pre-computed data from selected result
  const handleLoadData = async () => {
    if (availableResults.length === 0) {
      toast({
        message: {
          type: "Error",
          icon: true,
          content: "No pre-computed results available",
        },
      });
      return;
    }

    const selectedResult = availableResults[selectedResultIndex];
    if (!selectedResult) {
      toast({
        message: {
          type: "Error",
          icon: true,
          content: "No result selected",
        },
      });
      return;
    }

    setLoading(true);
    try {
      // Use filename directly if available (most reliable method)
      const data = await fetchPrecomputedDR(
        selectedResult.filename 
          ? { filename: selectedResult.filename }
          : {
              method: selectedResult.method || precomputedDrSettings.drMethod,
              hvg_strategy: selectedResult.hvg_strategy || precomputedDrSettings.hvgStrategy,
              n_hvgs: selectedResult.n_hvgs || precomputedDrSettings.nHvgs,
              cell_lines: selectedResult.cell_lines?.join(",") || precomputedDrSettings.selectedCellLines.join(","),
            }
      );

      if (data) {
        // Store in results store
        dispatch(resultReceived({
          result: data,
          module: "precomputedDrGraph"
        }));
        toast({
          message: {
            type: "Success",
            icon: true,
            content: "Pre-computed DR data loaded successfully",
          },
        });
      } else {
        toast({
          message: {
            type: "Error",
            icon: true,
            content: "No pre-computed data found for these parameters",
          },
        });
      }
    } catch (error) {
      console.error("Error loading pre-computed DR:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
      if (errorMessage.includes("No pre-computed")) {
        toast({
          message: {
            type: "Error",
            icon: true,
            content: "No pre-computed data found. Click 'Compute New Data' to generate it.",
          },
        });
      } else {
        toast({
          message: {
            type: "Error",
            icon: true,
            content: "Error loading data",
            details: errorMessage,
          },
        });
      }
    } finally {
      setLoading(false);
      // Ensure loading state is reset even if there was an error
      setTimeout(() => setLoading(false), 100);
    }
  };

  // Navigate to previous result
  const handlePreviousResult = () => {
    if (availableResults.length > 0) {
      const newIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : availableResults.length - 1;
      setSelectedResultIndex(newIndex);
      updateSettingsFromResult(availableResults[newIndex]);
    }
  };

  // Navigate to next result
  const handleNextResult = () => {
    if (availableResults.length > 0) {
      const newIndex = selectedResultIndex < availableResults.length - 1 ? selectedResultIndex + 1 : 0;
      setSelectedResultIndex(newIndex);
      updateSettingsFromResult(availableResults[newIndex]);
    }
  };

  // Update settings from a result (only if user is not manually editing)
  const updateSettingsFromResult = (result) => {
    if (userEditing) {
      console.log("Skipping auto-update - user is editing");
      return;
    }
    if (result && result.method && result.hvg_strategy && result.n_hvgs && result.cell_lines) {
      console.log("Auto-updating settings from result:", result);
      precomputedDrSettingsChanged({
        settingName: PrecomputedDrSettingsTypes.DR_METHOD,
        newValue: result.method,
      });
      precomputedDrSettingsChanged({
        settingName: PrecomputedDrSettingsTypes.HVG_STRATEGY,
        newValue: result.hvg_strategy,
      });
      precomputedDrSettingsChanged({
        settingName: PrecomputedDrSettingsTypes.N_HVGS,
        newValue: result.n_hvgs,
      });
      precomputedDrSettingsChanged({
        settingName: PrecomputedDrSettingsTypes.SELECTED_CELL_LINES,
        newValue: result.cell_lines,
      });
    }
  };

  const selectedResult = availableResults[selectedResultIndex] || null;

  return (
    <>
      {/* Available Results Table at the Top */}
      <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
        <Text size="small" style={{ fontWeight: "bold", marginBottom: "8px", display: "block" }}>
          Available Pre-computed Results ({availableResults.length}):
        </Text>
        
        {loadingResults ? (
          <Text size="small" style={{ color: "#666", fontStyle: "italic" }}>
            Loading results...
          </Text>
        ) : availableResults.length === 0 ? (
          <Text size="small" style={{ color: "#666", fontStyle: "italic" }}>
            No pre-computed results found. Click "Compute New Data" to generate results.
          </Text>
        ) : (
          <>
            {/* Results Table */}
            <div style={{ marginBottom: "8px" }}>
              <MaterialReactTable table={table} />
            </div>
            
            {/* Load Selected Result Button */}
            <Button
              label={loading ? "Loading..." : "Load Selected Result"}
              onClick={handleLoadData}
              disabled={loading || computing || availableResults.length === 0 || selectedResultIndex < 0}
              style={{ 
                width: "100%", 
                marginTop: "8px",
                backgroundColor: "#1976d2",
                color: "#fff"
              }}
            />
          </>
        )}
      </div>

      <Field
        label="HVG Strategy"
        labelLeft
        labelWidth="130px"
        helpText="Select how to combine HVGs across cell lines"
      >
        <Select
          key={`hvg-strategy-${precomputedDrSettings?.hvgStrategy}`} // Force re-render when value changes
          value={precomputedDrSettings?.hvgStrategy || "union"}
          placeholder="Select strategy..."
          options={hvgStrategyOptions}
          disabled={computing || loading || loadingResults}
          onChange={({ target: { value } }) => {
            console.log("HVG Strategy onChange triggered:", value, "Current Redux state before:", precomputedDrSettings?.hvgStrategy);
            setUserEditing(true);
            const action = precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.HVG_STRATEGY,
              newValue: value,
            });
            console.log("Dispatched action:", action);
            // Use a longer timeout to prevent auto-updates from overriding user changes
            setTimeout(() => {
              console.log("Resetting userEditing flag after change, new Redux state should be:", value);
              setUserEditing(false);
            }, 2000); // Reset after 2 seconds
          }}
        />
      </Field>

      <Field
        label="Number of HVGs"
        labelLeft
        labelWidth="130px"
        helpText="Number of highly variable genes to use"
      >
        <input
          type="number"
          min="500"
          max="5000"
          step="100"
          value={precomputedDrSettings?.nHvgs || 2000}
          disabled={computing || loading || loadingResults}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 2000;
            console.log("N HVGs changed to:", value);
            setUserEditing(true);
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.N_HVGS,
              newValue: value,
            });
            setTimeout(() => setUserEditing(false), 1000); // Reset after 1 second
          }}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            opacity: (computing || loading || loadingResults) ? 0.6 : 1,
            cursor: (computing || loading || loadingResults) ? "not-allowed" : "text",
            pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
          }}
        />
      </Field>

      <Field
        label="DR Method"
        labelLeft
        labelWidth="130px"
        helpText="Dimensionality reduction method"
      >
        <Select
          value={precomputedDrSettings?.drMethod}
          placeholder="Select method..."
          options={drMethodOptions}
          disabled={computing || loading || loadingResults}
          onChange={({ target: { value } }) => {
            console.log("DR Method changed to:", value);
            setUserEditing(true);
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.DR_METHOD,
              newValue: value,
            });
            setTimeout(() => setUserEditing(false), 1000); // Reset after 1 second
          }}
        />
      </Field>

      <Field
        label="Cell Lines"
        labelLeft
        labelWidth="130px"
        helpText="Select cell lines to include (multi-select)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {cellLineOptions.map((option) => {
            const isSelected = precomputedDrSettings?.selectedCellLines?.includes(
              option.value
            );
            return (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={computing || loading || loadingResults}
                  onChange={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    const current = precomputedDrSettings?.selectedCellLines || [];
                    let newSelection;
                    if (e.target.checked) {
                      newSelection = [...current, option.value];
                    } else {
                      newSelection = current.filter((cl) => cl !== option.value);
                    }
                    console.log("Cell lines changed to:", newSelection);
                    setUserEditing(true);
                    precomputedDrSettingsChanged({
                      settingName: PrecomputedDrSettingsTypes.SELECTED_CELL_LINES,
                      newValue: newSelection,
                    });
                    setTimeout(() => setUserEditing(false), 1000); // Reset after 1 second
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling to parent
                  }}
                  style={{
                    pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
                    cursor: (computing || loading || loadingResults) ? "not-allowed" : "pointer",
                  }}
                />
                <Text size="small">{option.label}</Text>
              </label>
            );
          })}
        </div>
      </Field>

      <Field
        label="View Mode"
        labelLeft
        labelWidth="130px"
        helpText="Choose between 2D and 3D visualization (3D requires PC3 data)"
      >
        <Select
          value={coreSettings?.graphType || "3D"}
          placeholder="Select view mode..."
          options={[
            { label: "2D", value: "2D" },
            { label: "3D", value: "3D" },
          ]}
          disabled={computing || loading || loadingResults}
          onChange={({ target: { value } }) => {
            console.log("View Mode changed to:", value);
            coreSettingsChanged({
              settingName: CoreSettingsTypes.GRAPH_TYPE,
              newValue: value,
            });
          }}
        />
      </Field>

      <Field
        label="Color By"
        labelLeft
        labelWidth="130px"
        helpText={
          precomputedDrSettings?.concatenationMode === "genes"
            ? "In 'genes' mode, samples are common perturbations - only cluster coloring is available"
            : "Choose how to color points in the plot"
        }
      >
        <Select
          value={
            precomputedDrSettings?.concatenationMode === "genes"
              ? "cluster" // Force cluster mode in 'genes' mode
              : (precomputedDrSettings?.colorBy || "cellLine")
          }
          placeholder="Select color mode..."
          options={
            precomputedDrSettings?.concatenationMode === "genes"
              ? [{ label: "Cluster", value: "cluster" }] // Only show cluster option in 'genes' mode
              : colorByOptions
          }
          disabled={
            computing || 
            loading || 
            loadingResults || 
            precomputedDrSettings?.concatenationMode === "genes" // Disable in 'genes' mode
          }
          onChange={({ target: { value } }) => {
            // In 'genes' mode, always use cluster
            if (precomputedDrSettings?.concatenationMode === "genes") {
              return; // Don't allow changes in 'genes' mode
            }
            console.log("Color By changed to:", value);
            setUserEditing(true);
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.COLOR_BY,
              newValue: value,
            });
            setTimeout(() => setUserEditing(false), 1000); // Reset after 1 second
          }}
        />
      </Field>

      <Field
        label="Concatenation Mode"
        labelLeft
        labelWidth="130px"
        helpText="How to combine datasets: 'samples' (original) or 'genes' (new gene_cellline approach)"
      >
        <Select
          value={precomputedDrSettings?.concatenationMode || "samples"}
          placeholder="Select mode..."
          options={[
            { label: "Samples (Original)", value: "samples" },
            { label: "Genes (Gene_Cellline)", value: "genes" },
          ]}
          disabled={computing || loading || loadingResults}
          onChange={({ target: { value } }) => {
            console.log("Concatenation Mode changed to:", value);
            setUserEditing(true);
            precomputedDrSettingsChanged({
              settingName: PrecomputedDrSettingsTypes.CONCATENATION_MODE,
              newValue: value,
            });
            setTimeout(() => setUserEditing(false), 1000);
          }}
        />
      </Field>

      {precomputedDrSettings?.concatenationMode === "genes" && (
        <>
          <Field
            label="Use Common Perturbations Only"
            labelLeft
            labelWidth="130px"
            helpText="If enabled, use only perturbations present in ALL cell lines (recommended). Avoids zeros that can affect DR quality."
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={precomputedDrSettings?.useCommonPerturbations !== false}
                disabled={computing || loading || loadingResults}
                onChange={(e) => {
                  console.log("Use Common Perturbations changed to:", e.target.checked);
                  setUserEditing(true);
                  precomputedDrSettingsChanged({
                    settingName: PrecomputedDrSettingsTypes.USE_COMMON_PERTURBATIONS,
                    newValue: e.target.checked,
                  });
                  setTimeout(() => setUserEditing(false), 1000);
                }}
                style={{
                  cursor: (computing || loading || loadingResults) ? "not-allowed" : "pointer",
                  pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
                }}
              />
              <Text size="small">
                {precomputedDrSettings?.useCommonPerturbations !== false 
                  ? "Yes (Recommended - avoids zeros)" 
                  : "No (Use all perturbations, fill missing with 0)"}
              </Text>
            </label>
          </Field>

          <Field
            label="Top Gene_Celllines"
            labelLeft
            labelWidth="130px"
            helpText="Number of most variable gene_cellline combinations to use"
          >
            <input
              type="number"
              min="1000"
              max="20000"
              step="500"
              value={precomputedDrSettings?.nTopGeneCelllines || 6000}
              disabled={computing || loading || loadingResults}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 6000;
                console.log("N Top Gene_Celllines changed to:", value);
                setUserEditing(true);
                precomputedDrSettingsChanged({
                  settingName: PrecomputedDrSettingsTypes.N_TOP_GENE_CELLLINES,
                  newValue: value,
                });
                setTimeout(() => setUserEditing(false), 1000);
              }}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                opacity: (computing || loading || loadingResults) ? 0.6 : 1,
                cursor: (computing || loading || loadingResults) ? "not-allowed" : "text",
                pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
              }}
            />
          </Field>
        </>
      )}

      {precomputedDrSettings?.concatenationMode === "samples" && (
        <>
          <Field
            label="Batch Correction (Harmony)"
            labelLeft
            labelWidth="130px"
            helpText="Enable Harmony batch correction to align perturbations across cell lines. Removes cell line batch effects while preserving biological variation."
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={precomputedDrSettings?.useBatchCorrection === true}
                disabled={computing || loading || loadingResults}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  console.log("[FRONTEND] Use Batch Correction checkbox changed to:", newValue);
                  console.log("[FRONTEND] Current Redux state before change:", precomputedDrSettings?.useBatchCorrection);
                  setUserEditing(true);
                  const action = precomputedDrSettingsChanged({
                    settingName: PrecomputedDrSettingsTypes.USE_BATCH_CORRECTION,
                    newValue: newValue,
                  });
                  console.log("[FRONTEND] Dispatched action:", action);
                  // Verify the state was updated after a short delay
                  setTimeout(() => {
                    console.log("[FRONTEND] Redux state after change (from props):", precomputedDrSettings?.useBatchCorrection);
                    setUserEditing(false);
                  }, 2000);
                }}
                style={{
                  cursor: (computing || loading || loadingResults) ? "not-allowed" : "pointer",
                  pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
                }}
              />
              <Text size="small">
                {precomputedDrSettings?.useBatchCorrection 
                  ? "Enabled (aligns perturbations across cell lines)" 
                  : "Disabled (cell lines may separate in DR space)"}
              </Text>
            </label>
          </Field>

          {precomputedDrSettings?.useBatchCorrection && (
            <>
              <Field
                label="Harmony Theta"
                labelLeft
                labelWidth="130px"
                helpText="Diversity clustering penalty (higher = more aggressive batch correction). Default: 1.0"
              >
                <input
                  type="number"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={precomputedDrSettings?.batchCorrectionTheta || 1.0}
                  disabled={computing || loading || loadingResults}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 1.0;
                    console.log("Batch Correction Theta changed to:", value);
                    setUserEditing(true);
                    precomputedDrSettingsChanged({
                      settingName: PrecomputedDrSettingsTypes.BATCH_CORRECTION_THETA,
                      newValue: value,
                    });
                    setTimeout(() => setUserEditing(false), 1000);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    opacity: (computing || loading || loadingResults) ? 0.6 : 1,
                    cursor: (computing || loading || loadingResults) ? "not-allowed" : "text",
                    pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
                  }}
                />
              </Field>

              <Field
                label="Harmony Max Iterations"
                labelLeft
                labelWidth="130px"
                helpText="Maximum iterations for Harmony convergence. Default: 10"
              >
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={precomputedDrSettings?.batchCorrectionMaxIter || 10}
                  disabled={computing || loading || loadingResults}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 10;
                    console.log("Batch Correction Max Iter changed to:", value);
                    setUserEditing(true);
                    precomputedDrSettingsChanged({
                      settingName: PrecomputedDrSettingsTypes.BATCH_CORRECTION_MAX_ITER,
                      newValue: value,
                    });
                    setTimeout(() => setUserEditing(false), 1000);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    opacity: (computing || loading || loadingResults) ? 0.6 : 1,
                    cursor: (computing || loading || loadingResults) ? "not-allowed" : "text",
                    pointerEvents: (computing || loading || loadingResults) ? "none" : "auto",
                  }}
                />
              </Field>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Button
          label={computing ? "Computing..." : "Compute New Data"}
          onClick={handleComputeData}
          disabled={computing || loading}
          style={{ width: "100%", backgroundColor: "#4CAF50", color: "#fff" }}
        />
      </div>

      {precomputedDrSettings?.selectedCellLines?.length === 0 && (
        <Text size="small" muted style={{ marginTop: "8px", color: "#dc3545" }}>
          Please select at least one cell line
        </Text>
      )}
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  precomputedDrSettings: settings?.precomputedDr ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = (dispatch) => ({
  precomputedDrSettingsChanged: (payload) => dispatch(precomputedDrSettingsChanged(payload)),
  coreSettingsChanged: (payload) => dispatch(coreSettingsChanged(payload)),
  dispatch,
});

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(PrecomputedDrSettings);

export { MainContainer as PrecomputedDrSettings };

