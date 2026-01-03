import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import InCHlib from "../../store/extra/inchlib-1.2.0.js";
import styles from "./heat-map.module.scss";
import { GeneSetEnrichmentTable } from "../enrichment/index.jsx";
import {
  FaChartBar,
  FaTable,
  FaUndo,
  FaArrowsAlt,
  FaDownload,
  FaRegCheckSquare,
  FaRegSquare,
} from "react-icons/fa";
import EnrichmentTable from "../enrichment-table-new/index.jsx";
import { connect, useDispatch } from "react-redux";
import { Spacer, ButtonGroup } from "@oliasoft-open-source/react-ui-library";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { LoadingPage } from "../loading-page";
import { throttle } from "lodash";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { saveAs } from "file-saver";
import { inchlibSettingsChanged } from "../../store/settings/inchlib-settings";
import { InchlibSettingsTypes } from "../side-bar/settings/enums";

const moduleDescription = {
  title: "Interactive Heatmap Visualization",
  description: "This module creates heatmaps from the selected perturbation data, allowing you to input lists of genes and perturbations to render gene expression data with customizable clustering on both rows and columns.",
  features: [
    "Customizable clustering parameters for rows and columns",
    "Interactive zoom and pan functionality", 
    "Color scale adjustments and percentile controls",
    "One-click gene list creation from clusters",
    "Integrated gene set enrichment analysis (GSEA)"
  ],  
};

const HeatMap = ({
  graphData,
  correlationSettings,
  inchlibSettings,
  calcResults,
  showDescription = true,
  datasetScores = null,
  datasets = null,
  isMultiDataset = false,
}) => {
  const dispatch = useDispatch();
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedView, setSelectedView] = useState(0);
  //const [keyedData, setKeyedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);

  const heatmapContainerRef = useRef(null);
  const heatmapRef = useRef(null);
  const inchlibInstance = useRef(null);
  const transformWrapperRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const instanceIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const fitToScreenRetryTimeoutRef = useRef(null);
  const manualFitToScreenTimeoutRef = useRef(null);
  const gcTimeoutRef = useRef(null);
  const resizeObserverCallbackRef = useRef(null);
  const contextMenuRef = useRef(null);

  const asBool = useCallback((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      return value.toLowerCase() === "true" || value === "1";
    }
    return Boolean(value);
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const [isExporting, setIsExporting] = useState(false);

  const exportHeatmapImage = useCallback(async ({ mimeType, extension, quality }) => {
    const inchlib = inchlibInstance.current;
    const stage = inchlib?.stage;
    if (!stage) return;

    const delayFrame = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });

    const compositeStageToCanvas = () => {
      const content = stage.getContent?.();
      const canvases = content?.getElementsByTagName?.("canvas");
      if (!canvases || canvases.length === 0) {
        throw new Error("Export failed: canvas not available");
      }

      const baseCanvas = canvases[0];
      const out = document.createElement("canvas");
      out.width = baseCanvas.width;
      out.height = baseCanvas.height;

      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Export failed: canvas context not available");

      // Force an opaque white background (PNG/JPEG) so labels/dendrograms render clearly.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);

      for (const c of canvases) {
        ctx.drawImage(c, 0, 0);
      }

      return out;
    };

    const canvasToBlob = (canvas) =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Export failed: could not create image blob"));
            else resolve(blob);
          },
          mimeType,
          quality
        );
      });

    try {
      setIsExporting(true);
      await delayFrame();

      inchlib?.navigation_layer?.hide?.();
      inchlib?.navigation_layer?.draw?.();

      const canvas = compositeStageToCanvas();
      const blob = await canvasToBlob(canvas);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      saveAs(blob, `heatmap-${timestamp}.${extension}`);
    } catch (e) {
      console.error(e);
    } finally {
      inchlib?.navigation_layer?.show?.();
      inchlib?.navigation_layer?.draw?.();
      setIsExporting(false);
    }
  }, []);

  const exportHeatmapAsPng = useCallback(() => {
    return exportHeatmapImage({
      mimeType: "image/png",
      extension: "png",
      quality: 1,
      backgroundColor: "#ffffff",
    });
  }, [exportHeatmapImage]);

  const exportHeatmapAsJpeg = useCallback(() => {
    return exportHeatmapImage({
      mimeType: "image/jpeg",
      extension: "jpg",
      quality: 1,
    });
  }, [exportHeatmapImage]);

  const toggleInchlibSetting = useCallback(
    (settingName) => {
      dispatch(
        inchlibSettingsChanged({
          settingName,
          newValue: !asBool(inchlibSettings?.[settingName]),
        })
      );
    },
    [dispatch, inchlibSettings, asBool]
  );

  const handleHeatmapContextMenu = useCallback(
    (e) => {
      if (loading || selectedView !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(e.clientX, window.innerWidth - 320);
      const y = Math.min(e.clientY, window.innerHeight - 360);
      setContextMenu({ x, y });
    },
    [loading, selectedView]
  );

  useEffect(() => {
    if (!contextMenu) return;

    const onMouseDown = (e) => {
      if (!contextMenuRef.current) return;
      if (!contextMenuRef.current.contains(e.target)) closeContextMenu();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeContextMenu();
    };

    const onScroll = () => closeContextMenu();

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [contextMenu, closeContextMenu]);

  const columns = useMemo(() => {
    if (isMultiDataset && datasets && datasets.length > 0) {
      // Multi-dataset mode: create grouped columns
      const datasetColumns = datasets.map(dataset => {
        const datasetName = dataset === 'K562gwps' ? 'K562' : 
                           dataset === 'HCT116gwps' ? 'HCT116' : 
                           dataset === 'HEK293gwps' ? 'HEK293' : dataset;
        return {
          accessorKey: dataset,
          header: datasetName,
          size: 70,
          enableColumnActions: false,
          Cell: ({ cell }) => {
            const value = cell.getValue();
            return typeof value === 'number' ? value.toFixed(3) : (value || '');
          },
        };
      });

      return [
        {
          accessorKey: "Gene 1",
          header: "Gene 1",
          size: 75,
          filterVariant: "autocomplete",
          minSize: 50,
          maxSize: 150,
          enableColumnActions: false,
          muiFilterTextFieldProps: {
            placeholder: "Symbol",
            size: "small",
          },
        },
        {
          accessorKey: "Gene 2",
          header: "Gene 2",
          size: 75,
          filterVariant: "autocomplete",
          enableColumnActions: false,
          muiFilterTextFieldProps: {
            placeholder: "Symbol",
            size: "small",
          },
        },
        {
          header: "Score",
          columns: datasetColumns,
        },
        {
          accessorKey: "Average",
          header: "Average",
          size: 80,
          enableColumnActions: false,
          Cell: ({ cell }) => {
            const value = cell.getValue();
            return typeof value === 'number' ? value.toFixed(3) : (value || '');
          },
        },
        {
          accessorKey: "Max",
          header: "Max",
          size: 80,
          enableColumnActions: false,
          Cell: ({ cell }) => {
            const value = cell.getValue();
            return typeof value === 'number' ? value.toFixed(3) : (value || '');
          },
        },
      ];
    } else {
      // Single dataset mode: original columns
      return [
        {
          accessorKey: "Gene 1",
          header: "Gene 1",
          size: 75,
          filterVariant: "autocomplete",
          minSize: 50,
          maxSize: 150,
          muiFilterTextFieldProps: {
            placeholder: "Symbol",
            size: "small",
          },
        },
        {
          accessorKey: "Gene 2",
          header: "Gene 2",
          size: 75,
          filterVariant: "autocomplete",
          muiFilterTextFieldProps: {
            placeholder: "Symbol",
            size: "small",
          },
        },
        {
          accessorKey: "Corr R",
          header: "Score",
          size: 50,
          filterVariant: "range-slider",
          muiFilterSliderProps: {
            size: "small",
            color: "primary",
            step: 0.01,
          },
          enableResizing: true,
        },
      ];
    }
  }, [isMultiDataset, datasets]);

  const genesets = useMemo(() => {
    return selectedGenes.length > 0
      ? { "Selected Genes": selectedGenes.join(", ") }
      : {};
  }, [selectedGenes]);

  const heatmapWidth = useMemo(() => {
    if (graphData) {
      return Math.min(
        Math.max(graphData.data.feature_names.length * 32, 200),
        6500
      );
    }
    return 200;
  }, [graphData]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (fitToScreenRetryTimeoutRef.current) {
        clearTimeout(fitToScreenRetryTimeoutRef.current);
        fitToScreenRetryTimeoutRef.current = null;
      }
      if (manualFitToScreenTimeoutRef.current) {
        clearTimeout(manualFitToScreenTimeoutRef.current);
        manualFitToScreenTimeoutRef.current = null;
      }
      if (gcTimeoutRef.current) {
        clearTimeout(gcTimeoutRef.current);
        gcTimeoutRef.current = null;
      }
      transformWrapperRef.current?.resetTransform();
      transformWrapperRef.current = null;
    };
  }, []);

const keyedData = useMemo(() => {
  if (!graphData?.data?.nodes) return [];

  // Multi-dataset mode: use dataset_scores
  if (isMultiDataset && datasetScores && datasets) {
    const tableInfo = [];
    const genePairs = new Set();
    
    // Collect all gene pairs from all datasets
    datasets.forEach(dataset => {
      if (datasetScores[dataset]) {
        Object.keys(datasetScores[dataset]).forEach(key => {
          const [gene1, gene2] = key.split('_');
          if (gene1 && gene2 && gene1 !== gene2) {
            genePairs.add(`${gene1}_${gene2}`);
          }
        });
      }
    });
    
    // Create rows for each gene pair
    genePairs.forEach(pairKey => {
      const [gene1, gene2] = pairKey.split('_');
      const row = {
        "Gene 1": gene1,
        "Gene 2": gene2,
      };
      
      // Add scores for each dataset
      const scores = [];
      datasets.forEach(dataset => {
        const score = datasetScores[dataset]?.[pairKey] || datasetScores[dataset]?.[`${gene2}_${gene1}`];
        row[dataset] = score !== undefined ? score : null;
        if (score !== undefined && score !== null) {
          scores.push(score);
        }
      });
      
      // Calculate Average and Max
      if (scores.length > 0) {
        row.Average = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        // Find value with maximum absolute value, preserving sign
        const maxAbs = Math.max(...scores.map(Math.abs));
        row.Max = scores.find(s => Math.abs(s) === maxAbs);
      } else {
        row.Average = null;
        row.Max = null;
      }
      
      // Only include rows with at least one score
      if (scores.length > 0) {
        tableInfo.push(row);
      }
    });
    
    return tableInfo;
  } else {
    // Single dataset mode: original logic
    const tableInfo = [];
    for (let i in graphData.data.nodes) {
      if (graphData.data.nodes[i].count === 1) {
        let gene1 = graphData.data.nodes[i].objects[0];
        for (let j in graphData.data.nodes[i].features) {
          const value = graphData.data.nodes[i].features[j];
          if (
            graphData.data.feature_names[j] !== gene1 &&
            (value > 0.05 || value < -0.05)
          ) {
            tableInfo.push({
              "Gene 1": gene1,
              "Gene 2": graphData.data.feature_names[j],
              "Corr R": value,
            });
          }
        }
      } else break;
    }
    return tableInfo;
  }
}, [graphData, isMultiDataset, datasetScores, datasets]);


  const logMemoryUsage = useCallback((label) => {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      console.log(`${label} - Memory Usage:`, {
        used: `${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        percentage: `${((usedJSHeapSize / totalJSHeapSize) * 100).toFixed(1)}%`
      });
    }
  }, []);

  const forceGarbageCollection = useCallback(() => {
    // Log memory before cleanup
    logMemoryUsage('Before GC');
    
    // Force garbage collection if available (dev tools or specific browsers)
    if (window.gc && typeof window.gc === 'function') {
      if (gcTimeoutRef.current) {
        clearTimeout(gcTimeoutRef.current);
      }
      gcTimeoutRef.current = setTimeout(() => {
        window.gc();
        logMemoryUsage('After GC');
        console.log('Forced garbage collection');
        gcTimeoutRef.current = null;
      }, 100);
    }
  }, [logMemoryUsage]);

  const destroyInchlibInstance = useCallback(() => {
    if (inchlibInstance.current) {
      try {
        // Use the comprehensive cleanup method from InCHlib
        if (typeof inchlibInstance.current.cleanup === 'function') {
          inchlibInstance.current.cleanup();
        }
        
        // Clear the container
        if (heatmapRef.current) {
          heatmapRef.current.innerHTML = '';
        }
        
        // Break all references
        inchlibInstance.current = null;
        
        // Force garbage collection
        forceGarbageCollection();
      } catch (e) {
        console.error("Error destroying InCHlib instance:", e);
      }
    }
  }, [forceGarbageCollection]);

  const handleResetZoom = useCallback(() => {
    transformWrapperRef.current?.resetTransform();
  }, []);

  const handleFitToScreen = useCallback(() => {
    const container = heatmapContainerRef.current;
    const heatmap = heatmapRef.current;

    if (container && heatmap && transformWrapperRef.current) {
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        try {
          const containerWidth = container.offsetWidth - 50;
          const heatmapWidth = heatmap.offsetWidth;
          
          // Ensure we have valid dimensions
          if (containerWidth > 0 && heatmapWidth > 0) {
            const scale = Math.min(containerWidth / heatmapWidth, 1); // Don't scale up beyond 100%
            transformWrapperRef.current?.setTransform(0, 0, scale);
          } else {
            // Retry after a short delay if dimensions aren't ready
            if (fitToScreenRetryTimeoutRef.current) {
              clearTimeout(fitToScreenRetryTimeoutRef.current);
            }
            fitToScreenRetryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                handleFitToScreen();
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error in handleFitToScreen:', error);
        }
      });
    }
  }, []);

  const handleManualFitToScreen = useCallback(() => {
    // Force a fit even if dimensions seem invalid
    const container = heatmapContainerRef.current;
    const heatmap = heatmapRef.current;

    if (container && heatmap && transformWrapperRef.current) {
      // Wait a bit longer for manual fit to ensure everything is ready
      if (manualFitToScreenTimeoutRef.current) {
        clearTimeout(manualFitToScreenTimeoutRef.current);
      }
      manualFitToScreenTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        try {
          const containerWidth = container.offsetWidth - 50;
          const heatmapWidth = heatmap.offsetWidth;
          
          if (containerWidth > 0 && heatmapWidth > 0) {
            const scale = Math.min(containerWidth / heatmapWidth, 1);
            transformWrapperRef.current?.setTransform(0, 0, scale);
          } else {
            // If dimensions are still invalid, try with a default scale
            transformWrapperRef.current?.setTransform(0, 0, 0.5);
          }
        } catch (error) {
          console.error('Error in manual fit to screen:', error);
        }
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.updateCellColors(
        inchlibSettings.color_scale.color
      );
    }
  }, [inchlibSettings.color_scale]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setDendrogramWidth(
        inchlibSettings.max_dendrogram_width
      );
    }
  }, [inchlibSettings.max_dendrogram_width]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.updateCellColorsPercentile({
        minValue: inchlibSettings.color_percentile_min,
        maxValue: inchlibSettings.color_percentile_max,
      });
    }
  }, [
    inchlibSettings.color_percentile_min,
    inchlibSettings.color_percentile_max,
    inchlibSettings.color_scale.color,
  ]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setRowIdsVisibility(
        asBool(inchlibSettings.draw_row_ids)
      );
    }
  }, [inchlibSettings.draw_row_ids, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnIdsVisibility(
        asBool(inchlibSettings.show_column_names)
      );
    }
  }, [inchlibSettings.show_column_names, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setCellValueVisibility(
        asBool(inchlibSettings.show_cell_values)
      );
    }
  }, [inchlibSettings.show_cell_values, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      const ratio = Number(inchlibSettings.width_ratio);
      if (Number.isFinite(ratio)) {
        inchlibInstance.current.setDendrogramWidth(ratio);
      }
    }
  }, [inchlibSettings.width_ratio]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setDendrogramVisibility(
        asBool(inchlibSettings.show_row_dendrogram)
      );
    }
  }, [inchlibSettings.show_row_dendrogram, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnDendrogramVisibility(
        asBool(inchlibSettings.show_column_dendrogram)
      );
    }
  }, [inchlibSettings.show_column_dendrogram, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      const lineWidth = Number(inchlibSettings.dendrogram_line_width);
      if (Number.isFinite(lineWidth)) {
        inchlibInstance.current.updateDendrogramLineWidth(lineWidth);
      }
    }
  }, [inchlibSettings.dendrogram_line_width]);

  useEffect(() => {
    // Set loading based on calculation state
    if (calcResults?.["corrCluster"]?.running) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [calcResults?.["corrCluster"]?.running]);

  useEffect(() => {
    if (!graphData) return;
    
    // Increment instance ID
    const currentInstanceId = ++instanceIdRef.current;
    
    // Destroy previous instance with proper cleanup
    destroyInchlibInstance();
    
    // Create container for new instance
    const containerId = `heatmap-${currentInstanceId}`;
    if (heatmapRef.current) {
      heatmapRef.current.id = containerId;
    }
    
    // Create new InCHlib instance
    const inchlib = new InCHlib({
      target: containerId,
      metadata: false,
      column_metadata: true,
      heatmap_header: true,
      column_dendrogram: true,
      max_height: heatmapWidth,
      dendrogram: true,
      width: heatmapWidth,
      heatmap_colors: inchlibSettings.color_scale.color ?? "BuWhRd",
      metadata_colors: "Reds",
      independent_columns: false,
      draw_row_ids: (graphData?.data?.nodes?.length ?? 0) > 120 ? false : true,
      heatmap_part_width: 0.95,
      max_column_width: 20,
      max_row_height: 20,
      heatmap: false,
      fixed_row_id_size: (graphData?.data?.nodes?.length ?? 0) > 120 ? 0 : 14,
    });
    
    inchlibInstance.current = inchlib;

    // Set event handlers
    inchlib.events.row_onclick = function (ids) {
      if (ids.length === 1) {
        inchlib.highlight_rows(ids);
        inchlib.unhighlight_cluster();
      }
    };

    inchlib.events.column_dendrogram_node_onclick = function (column_indexes) {
      const selectedGenesTemp = Object.keys(column_indexes).map(
        (gene) => inchlib.data?.feature_names[gene].split("_")[0]
      );
      if (selectedGenesTemp.length > 3 && isMountedRef.current) {
        setSelectedGenes(selectedGenesTemp);
      }
    };

    inchlib.events.dendrogram_node_onclick = function (object_ids) {
      if (isMountedRef.current) {
        setSelectedGenes(object_ids.map((gene) => gene.split("_")[0]));
      }
      inchlib.highlight_rows([]);
    };

    inchlib.events.empty_space_onclick = function () {
      inchlib.highlight_rows([]);
      inchlib.unhighlight_cluster();
    };

    // Draw heatmap
    // Only set loading if calculation is not running
    if (!calcResults?.["corrCluster"]?.running) {
      setLoading(true);
    }
    inchlib.read_data(graphData);
    inchlib.update_settings({
      width: heatmapWidth,
      heatmap: true,
      max_height: heatmapWidth,
      heatmap_header: true,
    });
    inchlib.draw();

    // Apply same order if needed
    if (correlationSettings?.row_col_sameorder) {
      let coordinates = Object.entries(inchlib.leaves_y_coordinates).sort(
        (a, b) => a[1] - b[1]
      );

      const valueKeyMap = new Map(
        Object.entries(inchlib.objects2leaves).map(([k, v]) => [v, k])
      );

      const columnOrder = coordinates
        .map(([key]) => valueKeyMap.get(key))
//        .reverse()
        .map((gene) =>
          graphData.data.feature_names.findIndex((f) => f === gene)
        );

      inchlib.update_settings({
        columns_order: columnOrder.reverse(),
        column_dendrogram: true,
        heatmap: true,
      });
      inchlib.redraw();
    }
    
    if (isMountedRef.current && currentInstanceId === instanceIdRef.current) {
      setLoading(false);
      // Use requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        if (isMountedRef.current && currentInstanceId === instanceIdRef.current) {
          handleFitToScreen();
        }
      });
    }

    // Cleanup function
    return () => {
      if (inchlibInstance.current) {
        destroyInchlibInstance();
      }
    };
  }, [graphData, correlationSettings?.row_col_sameorder, heatmapWidth, destroyInchlibInstance, handleFitToScreen]);

  // Resize observer
  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    const throttledFit = throttle(() => {
      // Only auto-fit if not currently loading
      if (!loading && inchlibInstance.current) {
        handleFitToScreen();
      }
    }, 200);

    resizeObserverCallbackRef.current = throttledFit;
    resizeObserverRef.current = new ResizeObserver(throttledFit);

    resizeObserverRef.current.observe(heatmapContainerRef.current);
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (resizeObserverCallbackRef.current?.cancel) {
        resizeObserverCallbackRef.current.cancel();
      }
      resizeObserverCallbackRef.current = null;
    };
  }, [handleFitToScreen, loading]);

  // Comprehensive cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Destroy InCHlib instance first
      destroyInchlibInstance();
      
      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (resizeObserverCallbackRef.current?.cancel) {
        resizeObserverCallbackRef.current.cancel();
      }
      resizeObserverCallbackRef.current = null;

      if (fitToScreenRetryTimeoutRef.current) {
        clearTimeout(fitToScreenRetryTimeoutRef.current);
        fitToScreenRetryTimeoutRef.current = null;
      }
      if (manualFitToScreenTimeoutRef.current) {
        clearTimeout(manualFitToScreenTimeoutRef.current);
        manualFitToScreenTimeoutRef.current = null;
      }
      if (gcTimeoutRef.current) {
        clearTimeout(gcTimeoutRef.current);
        gcTimeoutRef.current = null;
      }
      
      // Reset transform wrapper
      if (transformWrapperRef.current) {
        transformWrapperRef.current.resetTransform();
        transformWrapperRef.current = null;
      }
      
      // Clear all refs
      heatmapRef.current = null;
      inchlibInstance.current = null;
      heatmapContainerRef.current = null;
      instanceIdRef.current = 0;
      
      // Force garbage collection
      forceGarbageCollection();
    };
  }, [destroyInchlibInstance, forceGarbageCollection]);

  // Get progress state
  const progressMessage = calcResults?.["corrCluster"]?.progressMessage;
  const progressPercentage = calcResults?.["corrCluster"]?.progressPercentage;

  return (
    <>
      {loading && (
        <LoadingPage
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}
      {showDescription && (
          <Accordion
            sx={{
              marginBottom: '14px',
              backgroundColor: '#f8f9fa', 
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              '&:before': {
                display: 'none',
              },
              '& .MuiAccordionSummary-root': {
                minHeight: '30px',
                height: '30px',
              },
              '& .MuiAccordionSummary-root.Mui-expanded': {
                minHeight:  '30px',
                height: '30px',
              }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0',
                minHeight: '30px',
                '&.Mui-expanded': {
                  minHeight: '30px'
                }
              }}
            >
              <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>{moduleDescription.title}</h3>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: '0 14px 5px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>
              <div style={{ fontSize: '13px', color: '#424242' }}>
                <strong>Key Features:</strong>
                <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
                  {moduleDescription.features.map((capability, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>{capability}</li>
                  ))}
                </ul>
              </div>
            </AccordionDetails>
          </Accordion>
        )}
      <div
        style={{ visibility: loading ? "hidden" : "visible" }}
        className={styles.mainView}
        ref={heatmapContainerRef}
      >
        <div className={styles.controlBar}>
            <ButtonGroup
              items={[
                {
                  icon: <FaChartBar />,
                  key: 0,
                  label: "Heatmap",
                },
                {
                  icon: <FaTable />,
                  key: 1,
                  label: "Table",
                },
              ]}
              onSelected={(key) => setSelectedView(key)}
              value={selectedView}
            />

            <div
              className={styles.controlGroup}
              style={{
                visibility: selectedView === 0 && !loading ? "visible" : "hidden",
              }}
            >
              <div className={styles.zoomControls}>
                <button
                  onClick={handleResetZoom}
                  className={styles.zoomButton}
                  aria-label="Reset Zoom"
                >
                  RESET ZOOM
                </button>
                <button
                  onClick={handleManualFitToScreen}
                  className={styles.zoomButton}
                  aria-label="Fit to Screen"
                >
                  FIT TO SCREEN
                </button>
              </div>
            </div>
          </div>
          
          <Spacer height={5} />
          
          {keyedData && selectedView === 1 && (
            <div className={styles.geneTable}>
              <EnrichmentTable data={keyedData} columns={columns} />
            </div>
          )}
          
          <div
            className={styles.mainContent}
            style={{ display: selectedView === 0 ? "flex" : "none" }}
          >
            <div
              className={styles.mainContent}
              style={{
                display: "block",
                width: "100%",
                overflow: "auto",
                marginBottom: "10px",
              }}
            >
              <TransformWrapper
                key="fixed-wrapper"
                initialScale={1}
                minScale={0.125}
                maxScale={4}
                initialPositionX={0}
                initialPositionY={0}
                limitToBounds={false}
                ref={transformWrapperRef}
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: true }}
                pinch={{ step: 0.1 }}
                zoomAnimation={{ disabled: true }}
                className={styles.transformWrapper}
              >
                <TransformComponent>
                  <div
                    id={`heatmap-${instanceIdRef.current}`}
                    style={{
                      height: "calc(100vh + 100px)",
                      minHeight: "800px",
                      marginBottom: "10px",
                    }}
                    ref={heatmapRef}
                    onContextMenu={handleHeatmapContextMenu}
                  ></div>
                </TransformComponent>
              </TransformWrapper>
            </div>
            
            <div
              id="protein_div"
              style={{
                marginLeft: "auto",
                display: "block",
                marginRight: "auto",
                width: "100%",
              }}
            >
              <div id="loadingform">
                {loading && (
                  <div id="loading">
                    <img
                      src="https://www.openscreen.cz/software/inchlib/static/img/loading.gif"
                      alt="Loading"
                    />
                  </div>
                )}
              </div>

              {selectedGenes.length > 3 && (
                <div className={styles.enrichmentTableContainer}>
                  <GeneSetEnrichmentTable genesets={genesets} />
                </div>
              )}
            </div>
          </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              closeContextMenu();
              handleResetZoom();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              <FaUndo />
            </span>
            Reset zoom
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              closeContextMenu();
              handleManualFitToScreen();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              <FaArrowsAlt />
            </span>
            Fit to screen
          </button>
          <div className={styles.contextMenuSeparator} />
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              closeContextMenu();
              exportHeatmapAsPng();
            }}
            disabled={!inchlibInstance.current?.stage}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              <FaDownload />
            </span>
            Export PNG
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              closeContextMenu();
              exportHeatmapAsJpeg();
            }}
            disabled={!inchlibInstance.current?.stage}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              <FaDownload />
            </span>
            Export JPEG
          </button>
          <div className={styles.contextMenuSeparator} />
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toggleInchlibSetting(InchlibSettingsTypes.DRAW_ROW_IDS);
              closeContextMenu();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              {asBool(inchlibSettings?.draw_row_ids) ? (
                <FaRegCheckSquare />
              ) : (
                <FaRegSquare />
              )}
            </span>
            {asBool(inchlibSettings?.draw_row_ids) ? "Hide" : "Show"} row IDs
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toggleInchlibSetting(InchlibSettingsTypes.SHOW_COLUMN_NAMES);
              closeContextMenu();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              {asBool(inchlibSettings?.show_column_names) ? (
                <FaRegCheckSquare />
              ) : (
                <FaRegSquare />
              )}
            </span>
            {asBool(inchlibSettings?.show_column_names) ? "Hide" : "Show"} column IDs
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toggleInchlibSetting(InchlibSettingsTypes.SHOW_ROW_DENDROGRAM);
              closeContextMenu();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              {asBool(inchlibSettings?.show_row_dendrogram) ? (
                <FaRegCheckSquare />
              ) : (
                <FaRegSquare />
              )}
            </span>
            {asBool(inchlibSettings?.show_row_dendrogram) ? "Hide" : "Show"} row dendrogram
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toggleInchlibSetting(InchlibSettingsTypes.SHOW_COLUMN_DENDROGRAM);
              closeContextMenu();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              {asBool(inchlibSettings?.show_column_dendrogram) ? (
                <FaRegCheckSquare />
              ) : (
                <FaRegSquare />
              )}
            </span>
            {asBool(inchlibSettings?.show_column_dendrogram) ? "Hide" : "Show"} column dendrogram
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              toggleInchlibSetting(InchlibSettingsTypes.SHOW_CELL_VALUES);
              closeContextMenu();
            }}
          >
            <span className={styles.contextMenuIcon} aria-hidden="true">
              {asBool(inchlibSettings?.show_cell_values) ? (
                <FaRegCheckSquare />
              ) : (
                <FaRegSquare />
              )}
            </span>
            {asBool(inchlibSettings?.show_cell_values) ? "Hide" : "Show"} cell values
          </button>
        </div>
      )}

      {isExporting && (
        <div className={styles.exportOverlay} aria-live="polite">
          Exporting image…
        </div>
      )}
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  calcResults,
  correlationSettings: settings?.correlation ?? {},
  inchlibSettings: settings?.inchlib ?? {},
});

const MainContainer = connect(mapStateToProps)(HeatMap);

export { MainContainer as HeatMap };
