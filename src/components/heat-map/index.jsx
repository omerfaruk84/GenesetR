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
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../enrichment-table-new/index.jsx";
import { connect } from "react-redux";
import { Spacer, ButtonGroup } from "@oliasoft-open-source/react-ui-library";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { LoadingPage } from "../loading-page";
import { throttle } from "lodash";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
}) => {
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedView, setSelectedView] = useState(0);
  //const [keyedData, setKeyedData] = useState([]);
  const [loading, setLoading] = useState(true);

  const heatmapContainerRef = useRef(null);
  const heatmapRef = useRef(null);
  const inchlibInstance = useRef(null);
  const transformWrapperRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const instanceIdRef = useRef(0);
  const isMountedRef = useRef(false);

  const columns = useMemo(
    () => [
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
    ],
    []
  );

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
      transformWrapperRef.current?.resetTransform();
    transformWrapperRef.current = null;
    };
  }, []);

const keyedData = useMemo(() => {
  if (!graphData?.data?.nodes) return [];

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
}, [graphData]);


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
      setTimeout(() => {
        window.gc();
        logMemoryUsage('After GC');
        console.log('Forced garbage collection');
      }, 100);
    }
    
    // Alternative method to encourage garbage collection
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        // Create and immediately discard some objects to trigger GC
        for (let i = 0; i < 100; i++) {
          const temp = new Array(1000).fill(Math.random());
        }
        logMemoryUsage('After manual GC attempt');
      });
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
        try {
          const containerWidth = container.offsetWidth - 50;
          const heatmapWidth = heatmap.offsetWidth;
          
          // Ensure we have valid dimensions
          if (containerWidth > 0 && heatmapWidth > 0) {
            const scale = Math.min(containerWidth / heatmapWidth, 1); // Don't scale up beyond 100%
            transformWrapperRef.current?.setTransform(0, 0, scale);
          } else {
            // Retry after a short delay if dimensions aren't ready
            setTimeout(() => handleFitToScreen(), 100);
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
      setTimeout(() => {
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
      inchlibInstance.current.setRowIdsVisibility(inchlibSettings.draw_row_ids);
    }
  }, [inchlibSettings.draw_row_ids]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnIdsVisibility(
        inchlibSettings.show_column_names
      );
    }
  }, [inchlibSettings.show_column_names]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setCellValueVisibility(
        inchlibSettings.show_cell_values
      );
    }
  }, [inchlibSettings.show_cell_values]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setWidthRatio(inchlibSettings.width_ratio);
    }
  }, [inchlibSettings.width_ratio]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setDendrogramVisibility(
        inchlibSettings.show_row_dendrogram
      );
    }
  }, [inchlibSettings.show_row_dendrogram]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.setColumnDendrogramVisibility(
        inchlibSettings.show_column_dendrogram
      );
    }
  }, [inchlibSettings.show_column_dendrogram]);

  useEffect(() => {
    if (inchlibInstance.current && instanceIdRef.current) {
      inchlibInstance.current.updateDendrogramLineWidth(
        inchlibSettings.dendrogram_line_width
      );
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
        .reverse()
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

    resizeObserverRef.current = new ResizeObserver(
      throttle(() => {
        // Only auto-fit if not currently loading
        if (!loading && inchlibInstance.current) {
          handleFitToScreen();
        }
      }, 200)
    );

    resizeObserverRef.current.observe(heatmapContainerRef.current);
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
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

  return (
    <>
      {loading && <LoadingPage />}
      <>
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
      </>
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