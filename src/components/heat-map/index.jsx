import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import InCHlib from "../../store/extra/inchlib-1.2.0.js";
import styles from "./heat-map.module.scss";
import { GeneSetEnrichmentTable, getSelectedLibraries } from "../enrichment/index.jsx";
import { performEnrichment } from "../enrichment/enrichrAPI";
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
import { LoadingPage } from "../loading-page";
import { throttle } from "lodash";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { saveAs } from "file-saver";
import { inchlibSettingsChanged } from "../../store/settings/inchlib-settings";
import { InchlibSettingsTypes } from "../side-bar/settings/enums";
import { withErrorBoundary } from "../error-boundary";
import { SendToMenu } from "../send-to";
import { setHeatmapRangeInfo } from "../cluster-heatmap/rangeInfo";
import ui from "../ui/ui.module.scss";
import { PlotHelp } from "../plot-help";
import { saveJpegAsPdf } from "../../utils/exporters";

// Optional InCHlib methods. The two bundled library versions (1.2.0 canvas and
// 2.0 WebGL) implement different subsets, so every control that depends on one
// of them is only offered when the loaded instance actually has it.
const INCHLIB_OPTIONAL_METHODS = [
  "resetCamera",
  "fitToScreen",
  "setRowIdsVisibility",
  "setColumnIdsVisibility",
  "setCellValueVisibility",
  "setDendrogramVisibility",
  "setColumnDendrogramVisibility",
  "setDendrogramWidth",
  "updateCellColors",
  "updateCellColorsPercentile",
  "updateDendrogramLineWidth",
  "getClusters",
];

// Enrichr accepts lists of 3-400 genes; at most this many clusters are
// enriched in one summary run (each one is several requests).
const SUMMARY_MIN_GENES = 3;
const SUMMARY_MAX_GENES = 400;
const SUMMARY_MAX_CLUSTERS = 16;

const baseSymbol = (name) => String(name).split("_")[0];

const formatAdjP = (value) => {
  if (!Number.isFinite(value)) return "";
  return value < 0.001 ? value.toExponential(1) : value.toFixed(3);
};

/** Lowest adjusted p-value over all libraries of an Enrichr result. */
const bestTerm = (results) => {
  let best = null;
  (results || []).forEach((library) => {
    (library?.data || []).forEach((term) => {
      const adjP = Number(term?.[6]);
      if (!Array.isArray(term) || !Number.isFinite(adjP)) return;
      if (!best || adjP < best.adjP) {
        best = {
          term: String(term[1] ?? "").split("(")[0].trim(),
          library: String(library.name || "").replaceAll("_", " "),
          adjP,
          overlap: Array.isArray(term[5]) ? term[5].length : 0,
        };
      }
    });
  });
  return best;
};

const csvField = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const detectInchlibCapabilities = (instance) => {
  const caps = {};
  INCHLIB_OPTIONAL_METHODS.forEach((method) => {
    caps[method] = !!instance && typeof instance[method] === "function";
  });
  return caps;
};

const NO_CAPABILITIES = detectInchlibCapabilities(null);

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
  inchlibConstructor = null,
}) => {
  const dispatch = useDispatch();
  const [selectedGenes, setSelectedGenes] = useState([]);
  // Which dendrogram the selected cluster came from ("row" or "column").
  const [selectedAxis, setSelectedAxis] = useState("row");
  // Width of the enrichment panel shown beside the heatmap (fast renderer).
  const [panelWidth, setPanelWidth] = useState(560);
  const panelDragRef = useRef(null);
  // Enrichment of every cluster of the current cut: { running, done, total, rows }.
  const [summary, setSummary] = useState(null);
  const summaryRunRef = useRef(0);
  const mainContentRef = useRef(null);
  // Height of the heatmap + panel area so that it ends at the window's edge.
  const [panelAreaHeight, setPanelAreaHeight] = useState(null);
  const [selectedView, setSelectedView] = useState(0);
  //const [keyedData, setKeyedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [capabilities, setCapabilities] = useState(NO_CAPABILITIES);

  const heatmapContainerRef = useRef(null);
  const heatmapRef = useRef(null);
  const inchlibInstance = useRef(null);
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

  const closeSelection = useCallback(() => {
    setSelectedGenes([]);
    inchlibInstance.current?.unhighlight_cluster?.();
    inchlibInstance.current?.highlightGenes?.([]);
  }, []);

  // Hovering a term in the enrichment table marks its genes on the heatmap.
  const handleTermHover = useCallback((genes) => {
    inchlibInstance.current?.highlightGenes?.(genes || []);
  }, []);

  const onPanelDragStart = useCallback(
    (event) => {
      panelDragRef.current = { x: event.clientX, width: panelWidth };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [panelWidth]
  );
  const onPanelDragMove = useCallback((event) => {
    const drag = panelDragRef.current;
    if (!drag) return;
    const limit = (heatmapContainerRef.current?.clientWidth || 1200) * 0.7;
    setPanelWidth(Math.round(Math.min(Math.max(drag.width + drag.x - event.clientX, 320), limit)));
  }, []);
  const onPanelDragEnd = useCallback(() => {
    panelDragRef.current = null;
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  // Number of clusters defined by the dendrogram cut lines (0 when there is no cut).
  const [clusterCount, setClusterCount] = useState(0);

  const exportClustersAsCsv = useCallback(() => {
    const clusters = inchlibInstance.current?.getClusters?.();
    if (!clusters) return;
    const lines = ["axis,cluster,size,name"];
    [
      ["row", clusters.rows],
      ["column", clusters.columns],
    ].forEach(([axis, list]) => {
      (list || []).forEach(({ cluster, size, items }) => {
        items.forEach((name) => {
          lines.push([axis, cluster, size, csvField(name)].join(","));
        });
      });
    });
    if (lines.length === 1) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    saveAs(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      `heatmap-clusters-${timestamp}.csv`
    );
  }, []);

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
      if (extension === "pdf") {
        // The page gets the size of the heatmap on screen; the image keeps
        // the full resolution of the canvas.
        const ratio = window.devicePixelRatio || 1;
        saveJpegAsPdf(new Uint8Array(await blob.arrayBuffer()), canvas.width / ratio, canvas.height / ratio, "heatmap");
        return;
      }
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

  const exportHeatmapAsPdf = useCallback(() => {
    return exportHeatmapImage({
      mimeType: "image/jpeg",
      extension: "pdf",
      quality: 0.95,
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

  const sidePanel = capabilities.getClusters && (selectedGenes.length > 0 || !!summary);

  // Side by side, heatmap and panel scroll on their own, so the area must fit
  // the window instead of the stacked layout's full viewport height.
  useEffect(() => {
    if (!sidePanel) {
      setPanelAreaHeight(null);
      return undefined;
    }
    const measure = () => {
      const element = mainContentRef.current;
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.scrollY;
      setPanelAreaHeight(Math.max(420, Math.round(window.innerHeight - top - 8)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [sidePanel]);

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

  // Enrichment of a cluster is tested against the genes it was drawn from:
  // all rows for a row cluster, all columns for a column cluster.
  const backgrounds = useMemo(() => {
    const data = graphData?.data;
    if (!data?.nodes) return { row: null, column: null };
    const unique = (names) => {
      const genes = Array.from(new Set(names.map(baseSymbol).filter(Boolean)));
      return genes.length > 0 ? genes : null;
    };
    return {
      row: unique(
        Object.values(data.nodes).flatMap((node) =>
          node && Array.isArray(node.objects) ? node.objects : []
        )
      ),
      column: unique(data.feature_names || []),
    };
  }, [graphData]);
  const enrichmentBackground = backgrounds[selectedAxis] || null;

  const closeSummary = useCallback(() => {
    summaryRunRef.current += 1; // drop a run still in progress
    setSummary(null);
    inchlibInstance.current?.setClusterLabels?.({});
  }, []);

  // Runs Enrichr for every cluster of the cut and keeps the best term of each.
  const runClusterSummary = useCallback(async () => {
    const inchlib = inchlibInstance.current;
    const clusters = inchlib?.getClusters?.();
    if (!clusters) return;
    const runId = ++summaryRunRef.current;
    const libraries = getSelectedLibraries().join().replaceAll(" ", "_");

    const rows = [];
    [
      ["row", clusters.rows],
      ["column", clusters.columns],
    ].forEach(([axis, list]) => {
      (list || []).forEach(({ cluster, items }) => {
        const genes = Array.from(new Set(items.map(baseSymbol).filter(Boolean)));
        const fits = genes.length >= SUMMARY_MIN_GENES && genes.length <= SUMMARY_MAX_GENES;
        rows.push({ axis, cluster, size: genes.length, genes, status: fits ? "pending" : "skipped" });
      });
    });
    const eligible = rows.filter((row) => row.status === "pending");
    eligible.slice(SUMMARY_MAX_CLUSTERS).forEach((row) => {
      row.status = "not run";
    });
    const jobs = eligible.slice(0, SUMMARY_MAX_CLUSTERS);

    setSelectedGenes([]);
    inchlib.unhighlight_cluster?.();
    inchlib.setClusterLabels?.({});
    setSummary({ running: jobs.length > 0, done: 0, total: jobs.length, rows: rows.map((row) => ({ ...row })) });

    const labels = { rows: {}, columns: {} };
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      let update;
      try {
        const results = await performEnrichment(job.genes.join(","), libraries, {
          background: backgrounds[job.axis],
        });
        const best = bestTerm(results);
        update = best ? { status: "done", ...best } : { status: "none" };
        if (best && best.adjP < 0.05) {
          labels[job.axis === "row" ? "rows" : "columns"][job.cluster] = best.term;
        }
      } catch (error) {
        update = { status: "failed" };
      }
      if (summaryRunRef.current !== runId || !isMountedRef.current) return;
      inchlibInstance.current?.setClusterLabels?.(labels);
      setSummary((previous) =>
        previous && {
          ...previous,
          done: i + 1,
          running: i + 1 < jobs.length,
          rows: previous.rows.map((row) =>
            row.axis === job.axis && row.cluster === job.cluster ? { ...row, ...update } : row
          ),
        }
      );
    }
  }, [backgrounds]);

  const heatmapWidth = useMemo(() => {
    const featureCount = graphData?.data?.feature_names?.length;
    if (featureCount) {
      return Math.min(Math.max(featureCount * 32, 420), 6500);
    }
    return 200;
  }, [graphData]);

  // The data is only drawable when it has the InCHlib structure.
  const hasValidData =
    !!graphData?.data?.nodes && Array.isArray(graphData?.data?.feature_names);

  // A cluster selected on a previous result must not drive the enrichment of
  // a new one.
  useEffect(() => {
    setSelectedGenes([]);
    summaryRunRef.current += 1;
    setSummary(null);
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
      inchlibInstance.current?.resetCamera?.();
    };
  }, []);

const keyedData = useMemo(() => {
  // The pair table can hold rows x columns entries; only build it while the
  // Table view is open.
  if (selectedView !== 1) return [];
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
}, [graphData, isMultiDataset, datasetScores, datasets, selectedView]);


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
    inchlibInstance.current?.resetCamera?.();
  }, []);

  const handleFitToScreen = useCallback(() => {
    const container =
      heatmapRef.current?.closest(`.${styles.mainContent}`) ||
      heatmapContainerRef.current;
    if (!container || !inchlibInstance.current) return;
    requestAnimationFrame(() => {
      if (!isMountedRef.current) return;
      const width = container.clientWidth || container.offsetWidth;
      const height = container.clientHeight || container.offsetHeight;
      if (width > 0 && height > 0) {
        inchlibInstance.current.fitToScreen?.(width, height);
      }
    });
  }, []);

  const handleManualFitToScreen = useCallback(() => {
    const container =
      heatmapRef.current?.closest(`.${styles.mainContent}`) ||
      heatmapContainerRef.current;
    if (!container || !inchlibInstance.current) return;
    if (manualFitToScreenTimeoutRef.current) {
      clearTimeout(manualFitToScreenTimeoutRef.current);
    }
    manualFitToScreenTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const width = container.clientWidth || container.offsetWidth;
      const height = container.clientHeight || container.offsetHeight;
      if (width > 0 && height > 0) {
        inchlibInstance.current.fitToScreen?.(width, height);
      }
    }, 150);
  }, []);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.updateCellColors?.(
        inchlibSettings.color_scale?.color
      );
    }
  }, [inchlibSettings.color_scale]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setDendrogramWidth?.(
        inchlibSettings.max_dendrogram_width
      );
    }
  }, [inchlibSettings.max_dendrogram_width]);

  useEffect(() => {
    const inchlib = inchlibInstance.current;
    if (!inchlib || !instanceIdRef.current) return;
    if (inchlib.setAutoRange && inchlibSettings.color_range_auto !== false) {
      inchlib.setAutoRange();
    } else {
      inchlib.updateCellColorsPercentile?.({
        minValue: inchlibSettings.color_percentile_min,
        maxValue: inchlibSettings.color_percentile_max,
      });
    }
  }, [
    inchlibSettings.color_percentile_min,
    inchlibSettings.color_percentile_max,
    inchlibSettings.color_scale?.color,
    inchlibSettings.color_range_auto,
  ]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setRowScaling?.(asBool(inchlibSettings.row_scaling));
    }
  }, [inchlibSettings.row_scaling, asBool]);

  // The settings panel sizes its range slider from the heatmap on screen.
  useEffect(() => () => setHeatmapRangeInfo(null), []);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setRowIdsVisibility?.(
        asBool(inchlibSettings.draw_row_ids)
      );
    }
  }, [inchlibSettings.draw_row_ids, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnIdsVisibility?.(
        asBool(inchlibSettings.show_column_names)
      );
    }
  }, [inchlibSettings.show_column_names, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setCellValueVisibility?.(
        asBool(inchlibSettings.show_cell_values)
      );
    }
  }, [inchlibSettings.show_cell_values, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      const ratio = Number(inchlibSettings.width_ratio);
      if (Number.isFinite(ratio)) {
        inchlibInstance.current.setDendrogramWidth?.(ratio);
      }
    }
  }, [inchlibSettings.width_ratio]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setDendrogramVisibility?.(
        asBool(inchlibSettings.show_row_dendrogram)
      );
    }
  }, [inchlibSettings.show_row_dendrogram, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnDendrogramVisibility?.(
        asBool(inchlibSettings.show_column_dendrogram)
      );
    }
  }, [inchlibSettings.show_column_dendrogram, asBool]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      const lineWidth = Number(inchlibSettings.dendrogram_line_width);
      if (Number.isFinite(lineWidth)) {
        inchlibInstance.current.updateDendrogramLineWidth?.(lineWidth);
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
    if (!graphData?.data?.nodes || !Array.isArray(graphData?.data?.feature_names)) {
      // Not an InCHlib payload (e.g. an empty or failed result): nothing to draw.
      destroyInchlibInstance();
      setCapabilities(NO_CAPABILITIES);
      setLoading(false);
      return;
    }

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
    const InchlibCtor = inchlibConstructor || InCHlib;
    const isWebGL = Boolean(inchlibConstructor);
    // `nodes` is an object keyed by node id; rows are its leaf nodes.
    const nodeList = Object.values(graphData?.data?.nodes || {});
    const rowCount = nodeList.reduce(
      (count, node) => (node && node.count === 1 ? count + 1 : count),
      0
    );
    const isLargeHeatmap = rowCount > 120;
    const useLod = rowCount > 350;
    const minRowHeight =
      rowCount > 2000 ? 0.25 : rowCount > 750 ? 0.5 : 1;
    const maxHeatmapHeight = Math.max(
      heatmapRef.current?.clientHeight || 0,
      800
    );
    const inchlib = new InchlibCtor({
      target: containerId,
      metadata: false,
      column_metadata: true,
      heatmap_header: true,
      column_dendrogram: true,
      max_height: maxHeatmapHeight,
      dendrogram: true,
      width: heatmapWidth,
      heatmap_colors: inchlibSettings.color_scale?.color ?? "BuWhRd",
      metadata_colors: "Reds",
      independent_columns: false,
      draw_row_ids: isWebGL ? true : !isLargeHeatmap,
      heatmap_part_width: 0.95,
      max_column_width: 20,
      max_row_height: 20,
      min_row_height: minRowHeight,
      heatmap: false,
      fixed_row_id_size: isWebGL ? 12 : isLargeHeatmap ? 0 : 14,
      row_id_min_zoom: isLargeHeatmap ? 1.1 : 1,
      column_header_min_zoom: isLargeHeatmap ? 1.0 : 1,
      cell_value_min_zoom: isLargeHeatmap ? 1.3 : 1,
      max_zoom_resolution: 4,
      use_tiled_heatmap: true,
      tile_rows: 64,
      tile_cols: 64,
      camera_min_scale: 0.1,
      camera_max_scale: 8,
      lod_enabled: isWebGL && useLod,
    });
    
    inchlibInstance.current = inchlib;

    // Record which optional controls this library version supports.
    const nextCapabilities = detectInchlibCapabilities(inchlib);
    setCapabilities((prev) =>
      INCHLIB_OPTIONAL_METHODS.every((m) => prev[m] === nextCapabilities[m])
        ? prev
        : nextCapabilities
    );

    // Set event handlers
    inchlib.events.row_onclick = function (ids) {
      if (ids.length === 1) {
        inchlib.highlight_rows(ids);
        inchlib.unhighlight_cluster();
      }
    };

    inchlib.events.column_dendrogram_node_onclick = function (column_indexes) {
      // InCHlib passes the *values* (column indexes) of the clicked cluster,
      // either as an array or as an object keyed by position.
      const indexes = Array.isArray(column_indexes)
        ? column_indexes
        : Object.values(column_indexes || {});
      // The indexes are column positions. With a custom columns_order (rows
      // and columns in the same order) position p shows feature
      // columns_order[p]; otherwise position and feature index coincide.
      const featureNames = inchlib.data?.feature_names || [];
      const order = inchlib.settings?.columns_order;
      const hasCustomOrder =
        Array.isArray(order) &&
        order.length >= featureNames.length &&
        order.some((value, position) => position < featureNames.length && value !== position);
      const selectedGenesTemp = indexes
        .map((index) => {
          const featureIndex = hasCustomOrder ? order[index] : index;
          const name = featureNames[featureIndex];
          return typeof name === "string" ? name.split("_")[0] : null;
        })
        .filter(Boolean);
      if (selectedGenesTemp.length > 0 && isMountedRef.current) {
        setSelectedAxis("column");
        setSelectedGenes(selectedGenesTemp);
      }
    };

    inchlib.events.dendrogram_node_onclick = function (object_ids) {
      if (isMountedRef.current) {
        setSelectedAxis("row");
        setSelectedGenes(
          (object_ids || []).map((gene) => String(gene).split("_")[0])
        );
      }
      inchlib.highlight_rows([]);
    };

    // Only the texture-based renderer has cut lines; the others ignore this.
    setClusterCount(0);
    inchlib.events.range_onchange = function (info) {
      setHeatmapRangeInfo(info);
    };
    // The range set on the heatmap's legend is stored like the sidebar's slider.
    inchlib.events.range_onuserchange = function ({ min, max, auto }) {
      if (!auto) {
        dispatch(inchlibSettingsChanged({ settingName: InchlibSettingsTypes.COLOR_PERCENTILE_MIN, newValue: min }));
        dispatch(inchlibSettingsChanged({ settingName: InchlibSettingsTypes.COLOR_PERCENTILE_MAX, newValue: max }));
      }
      dispatch(inchlibSettingsChanged({ settingName: InchlibSettingsTypes.COLOR_RANGE_AUTO, newValue: !!auto }));
    };
    inchlib.events.clusters_onchange = function (clusters) {
      if (isMountedRef.current) {
        // A summary describes the previous clusters.
        summaryRunRef.current += 1;
        setSummary(null);
        setClusterCount(
          (clusters?.rows?.length || 0) + (clusters?.columns?.length || 0)
        );
      }
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
      max_height: maxHeatmapHeight,
      heatmap_header: true,
    });
    inchlib.draw();
    if (inchlib.setAutoRange) {
      // The cluster heatmap starts from the display settings in the sidebar
      // (the InCHlib builds only follow them once they change).
      inchlib.setRowScaling(asBool(inchlibSettings.row_scaling));
      if (inchlibSettings.color_range_auto === false) {
        inchlib.updateCellColorsPercentile({
          minValue: inchlibSettings.color_percentile_min,
          maxValue: inchlibSettings.color_percentile_max,
        });
      }
      inchlib.setRowIdsVisibility(asBool(inchlibSettings.draw_row_ids ?? true));
      inchlib.setColumnIdsVisibility(asBool(inchlibSettings.show_column_names ?? true));
      inchlib.setCellValueVisibility(asBool(inchlibSettings.show_cell_values));
      inchlib.setDendrogramVisibility(asBool(inchlibSettings.show_row_dendrogram ?? true));
      inchlib.setColumnDendrogramVisibility(asBool(inchlibSettings.show_column_dendrogram ?? true));
      const lineWidth = Number(inchlibSettings.dendrogram_line_width);
      if (Number.isFinite(lineWidth)) inchlib.updateDendrogramLineWidth(lineWidth);
    } else {
      setHeatmapRangeInfo(null);
    }
    if (heatmapRef.current && inchlib.settings?.height) {
      heatmapRef.current.style.height = `${inchlib.settings.height}px`;
      heatmapRef.current.style.minHeight = "0px";
    }
    inchlib.request_viewport_update?.();

    // Apply same order if needed
    // Very small results come without a column dendrogram; their columns are
    // left in the order of the data, where header and cells agree.
    if (correlationSettings?.row_col_sameorder && graphData.column_dendrogram?.nodes) {
      // Check if properties exist before calling Object.entries
      if (inchlib.leaves_y_coordinates && inchlib.objects2leaves) {
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

        // Only reorder when every row maps onto a column (square matrix);
        // otherwise the order would contain -1 / undefined entries.
        const orderIsComplete =
          columnOrder.length === graphData.data.feature_names.length &&
          columnOrder.every((idx) => Number.isInteger(idx) && idx >= 0);
        if (orderIsComplete) {
          inchlib.update_settings({
            columns_order: columnOrder.reverse(),
            column_dendrogram: true,
            heatmap: true,
          });
          inchlib.redraw();
        } else {
          console.warn(
            "Rows and columns differ; keeping the clustered column order"
          );
        }
      } else {
        console.warn('InCHlib properties not yet initialized, skipping same order application');
      }
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
  }, [
    graphData,
    correlationSettings?.row_col_sameorder,
    heatmapWidth,
    destroyInchlibInstance,
    handleFitToScreen,
    inchlibConstructor,
  ]);

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
                <PlotHelp kind={window.location.pathname.includes("correlation") ? "correlationHeatmap" : "expressionHeatmap"} />
                <button
                  type="button"
                  onClick={exportHeatmapAsPng}
                  className={ui.button}
                  disabled={isExporting}
                  title="Download the heatmap as a PNG image"
                >
                  <FaDownload aria-hidden="true" style={{ marginRight: 6 }} />
                  {isExporting ? "Exporting…" : "Export PNG"}
                </button>
                <button
                  type="button"
                  onClick={exportHeatmapAsJpeg}
                  className={ui.button}
                  disabled={isExporting}
                  title="Download the heatmap as a JPEG image"
                >
                  <FaDownload aria-hidden="true" style={{ marginRight: 6 }} />
                  Export JPEG
                </button>
                <button
                  type="button"
                  onClick={exportHeatmapAsPdf}
                  className={ui.button}
                  disabled={isExporting}
                  title="Download the heatmap as a PDF page"
                >
                  <FaDownload aria-hidden="true" style={{ marginRight: 6 }} />
                  Export PDF
                </button>
                {capabilities.getClusters && clusterCount > 0 && (
                  <button
                    type="button"
                    onClick={exportClustersAsCsv}
                    className={ui.button}
                    title="Download the clusters defined by the dendrogram cut lines as CSV"
                  >
                    <FaDownload aria-hidden="true" style={{ marginRight: 6 }} />
                    Export clusters
                  </button>
                )}
                {capabilities.getClusters && clusterCount > 0 && (
                  <button
                    type="button"
                    onClick={runClusterSummary}
                    className={ui.button}
                    disabled={!!summary?.running}
                    title="Run enrichment for every cluster of the cut and show the best term of each"
                  >
                    {summary?.running
                      ? `Enriching ${summary.done}/${summary.total}…`
                      : "Enrich clusters"}
                  </button>
                )}
              </div>
              {(capabilities.resetCamera || capabilities.fitToScreen) && (
                <div className={styles.zoomControls}>
                  {capabilities.resetCamera && (
                    <button
                      onClick={handleResetZoom}
                      className={ui.button}
                      aria-label="Reset Zoom"
                    >
                      Reset zoom
                    </button>
                  )}
                  {capabilities.fitToScreen && (
                    <button
                      onClick={handleManualFitToScreen}
                      className={ui.button}
                      aria-label="Fit to Screen"
                    >
                      Fit to screen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <Spacer height={5} />

          {graphData && !hasValidData && (
            <div
              role="alert"
              style={{
                padding: "12px",
                backgroundColor: "#fff3cd",
                borderLeft: "4px solid #ffc107",
                borderRadius: "4px",
                color: "#8a6d3b",
                marginBottom: "8px",
              }}
            >
              The result does not contain heatmap data. Please check the gene
              lists and run the calculation again.
            </div>
          )}

          {keyedData && selectedView === 1 && (
            <div className={styles.geneTable}>
              <EnrichmentTable data={keyedData} columns={columns} />
            </div>
          )}
          
          <div
            className={styles.mainContent}
            ref={mainContentRef}
            style={{
              display: selectedView === 0 ? "flex" : "none",
              // With the fast renderer a selected cluster opens beside the heatmap.
              ...(sidePanel
                ? {
                    flexDirection: "row",
                    overflow: "hidden",
                    flex: "0 0 auto",
                    height: panelAreaHeight || undefined,
                  }
                : {}),
            }}
          >
            <div
              className={styles.scaledWrapper}
              style={{
                display: "block",
                width: "100%",
                overflow: "auto",
                marginBottom: "10px",
                position: "relative",
                height: "auto",
                ...(sidePanel ? { flex: "1 1 0", minWidth: 0, width: "auto" } : {}),
              }}
            >
              <div
                id={`heatmap-${instanceIdRef.current}`}
                style={{
                  marginBottom: "10px",
                  height: "auto",
                  minHeight: "0px",
                }}
                ref={heatmapRef}
                onContextMenu={handleHeatmapContextMenu}
              ></div>
            </div>
            
            {sidePanel && (
              <div
                className={styles.panelDivider}
                role="separator"
                aria-orientation="vertical"
                title="Drag to resize"
                onPointerDown={onPanelDragStart}
                onPointerMove={onPanelDragMove}
                onPointerUp={onPanelDragEnd}
                onPointerCancel={onPanelDragEnd}
              />
            )}
            <div
              id="protein_div"
              data-testid="cluster-panel"
              style={{
                marginLeft: "auto",
                display: "block",
                marginRight: "auto",
                width: "100%",
                ...(sidePanel
                  ? { flex: "0 0 auto", width: panelWidth, height: "100%", overflow: "auto", margin: 0 }
                  : {}),
              }}
            >
              <div id="loadingform">
                {loading && (
                  <div id="loading">
                    {/* Local spinner (was an image hot-linked from a third-party site) */}
                    <div
                      role="status"
                      aria-label="Drawing heatmap"
                      style={{
                        width: 44,
                        height: 44,
                        margin: "24px auto",
                        borderRadius: "50%",
                        border: "4px solid rgba(166, 54, 72, 0.18)",
                        borderTopColor: "#a63648",
                        animation: "genesetr-spin 0.9s linear infinite",
                      }}
                    />
                    <style>{"@keyframes genesetr-spin { to { transform: rotate(360deg); } }"}</style>
                  </div>
                )}
              </div>

              {/* Clusters too small for Enrichr get the table's own notice. */}
              {selectedGenes.length === 0 && summary && (
                <div className={styles.enrichmentTableContainer} data-testid="cluster-summary">
                  <div className={styles.panelHeader}>
                    <strong>Cluster enrichment · {summary.rows.length} clusters</strong>
                    <span className={styles.panelActions}>
                      <button
                        type="button"
                        className={ui.button}
                        onClick={closeSummary}
                        aria-label="Close the cluster enrichment"
                      >
                        Close
                      </button>
                    </span>
                  </div>
                  <p className={styles.panelNote}>
                    {summary.running
                      ? `Enriching cluster ${summary.done + 1} of ${summary.total}…`
                      : "Best term of each cluster (lowest adjusted p-value over the selected libraries), " +
                        "tested against the heatmap's own genes. Click a row to open the cluster."}
                  </p>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Cluster</th>
                        <th>Genes</th>
                        <th>Top term</th>
                        <th>Adj. p</th>
                        <th>Overlap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rows.map((row) => {
                        const significant = row.status === "done" && row.adjP < 0.05;
                        let text = "…";
                        if (row.status === "skipped") {
                          text =
                            row.size < SUMMARY_MIN_GENES
                              ? `fewer than ${SUMMARY_MIN_GENES} genes`
                              : `more than ${SUMMARY_MAX_GENES} genes`;
                        } else if (row.status === "not run") {
                          text = `not run (first ${SUMMARY_MAX_CLUSTERS} clusters only)`;
                        } else if (row.status === "failed") text = "Enrichr did not answer";
                        else if (row.status === "none") text = "no term";
                        else if (row.status === "done") text = `${row.term} (${row.library})`;
                        return (
                          <tr
                            key={`${row.axis}-${row.cluster}`}
                            className={row.size > 1 ? styles.summaryRow : undefined}
                            onClick={() =>
                              inchlibInstance.current?.selectCluster?.(row.axis, row.cluster)
                            }
                          >
                            <td>
                              {row.axis === "column" ? "Column" : "Row"} {row.cluster}
                            </td>
                            <td>{row.size}</td>
                            <td style={significant ? undefined : { opacity: 0.6 }}>{text}</td>
                            <td>{row.status === "done" ? formatAdjP(row.adjP) : ""}</td>
                            <td>{row.status === "done" ? `${row.overlap} / ${row.size}` : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedGenes.length > 0 && (
                <div className={styles.enrichmentTableContainer}>
                  <div className={styles.panelHeader}>
                    <strong>
                      {selectedAxis === "column" ? "Column" : "Row"} cluster · {selectedGenes.length} gene
                      {selectedGenes.length === 1 ? "" : "s"}
                    </strong>
                    <span className={styles.panelActions}>
                      {summary && (
                        <button
                          type="button"
                          className={ui.button}
                          onClick={closeSelection}
                          title="Back to the enrichment of all clusters"
                        >
                          All clusters
                        </button>
                      )}
                      <SendToMenu genes={selectedGenes} defaultName="Heatmap cluster" />
                      <button
                        type="button"
                        className={ui.button}
                        onClick={closeSelection}
                        aria-label="Close the cluster panel"
                        title="Clear the selection"
                      >
                        Close
                      </button>
                    </span>
                  </div>
                  <GeneSetEnrichmentTable
                    genesets={genesets}
                    onTermHover={handleTermHover}
                    background={enrichmentBackground}
                    backgroundLabel={
                      selectedAxis === "column" ? "heatmap columns" : "heatmap rows"
                    }
                  />
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
          {capabilities.resetCamera && (
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
          )}
          {capabilities.fitToScreen && (
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
          )}
          {(capabilities.resetCamera || capabilities.fitToScreen) && (
            <div className={styles.contextMenuSeparator} />
          )}
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
          {capabilities.setRowIdsVisibility && (
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
          )}
          {capabilities.setColumnIdsVisibility && (
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
          )}
          {capabilities.setDendrogramVisibility && (
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
          )}
          {capabilities.setColumnDendrogramVisibility && (
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
          )}
          {capabilities.setCellValueVisibility && (
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
          )}
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

const ConnectedHeatMap = connect(mapStateToProps)(HeatMap);

// InCHlib draws imperatively inside effects; a failure there must not blank
// the whole application. A new result resets the boundary automatically.
const MainContainer = withErrorBoundary(ConnectedHeatMap, {
  label: "Heatmap",
  resetKeys: (props) => [props.graphData],
});

export { MainContainer as HeatMap };
