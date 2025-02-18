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

const HeatMap = ({
  graphData,
  correlationSettings,
  inchlibSettings,
  calcResults,
}) => {
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedView, setSelectedView] = useState(0);
  const [keyedData, setKeyedData] = useState([]);
  const [loading, setLoading] = useState(true);

  const heatmapContainerRef = useRef(null);
  const heatmapRef = useRef(null);
  const inchlibInstance = useRef(null);
  const transformWrapperRef = useRef(null);
  const resizeObserverRef = useRef(null);

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
    if (graphData?.data?.nodes) {
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
        } else {
          break;
        }
      }
      setKeyedData(tableInfo);
    }
  }, [graphData]);

  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.updateCellColors(
        inchlibSettings.color_scale.color
      );
    }
  }, [inchlibSettings.color_scale]);

  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setDendrogramWidth(
        inchlibSettings.max_dendrogram_width
      );
    }
  }, [inchlibSettings.max_dendrogram_width]);

  useEffect(() => {
    if (inchlibInstance.current) {
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
    if (inchlibInstance.current) {
      inchlibInstance.current.setRowIdsVisibility(inchlibSettings.draw_row_ids);
    }
  }, [inchlibSettings.draw_row_ids]);

  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setColumnIdsVisibility(
        inchlibSettings.show_column_names
      );
    }
  }, [inchlibSettings.show_column_names]);

  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setCellValueVisibility(
        inchlibSettings.show_cell_values
      );
    }
  }, [inchlibSettings.show_cell_values]);

  // Update width ratio
  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setWidthRatio(inchlibSettings.width_ratio);
    }
  }, [inchlibSettings.width_ratio]);

  // Update row dendrogram visibility
  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setDendrogramVisibility(
        inchlibSettings.show_row_dendrogram
      );
    }
  }, [inchlibSettings.show_row_dendrogram]);

  // Update column dendrogram visibility
  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.setColumnDendrogramVisibility(
        inchlibSettings.show_column_dendrogram
      );
    }
  }, [inchlibSettings.show_column_dendrogram]);

  // Update column dendrogram visibility
  useEffect(() => {
    if (inchlibInstance.current) {
      inchlibInstance.current.updateDendrogramLineWidth(
        inchlibSettings.dendrogram_line_width
      );
    }
  }, [inchlibSettings.dendrogram_line_width]);

  useEffect(() => {
    if (inchlibInstance.current) return;
    // Only run if we haven't already created an instance
    if (!inchlibInstance.current && heatmapRef.current) {
      var inchlib = new InCHlib({
        target: "heatmap", // Corrected target as a string selector
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
        draw_row_ids:
          (graphData?.data?.nodes?.length ?? 0) > 120 ? false : true,
        heatmap_part_width: 0.95,
        max_column_width: 20,
        max_row_height: 20,
        heatmap: false,
        fixed_row_id_size: (graphData?.data?.nodes?.length ?? 0) > 120 ? 0 : 14,
      });

      inchlibInstance.current = inchlib;

      inchlib.events.row_onclick = function (ids) {
        if (ids.length === 1) {
          inchlib.highlight_rows(ids);
          inchlib.unhighlight_cluster();
        }
      };

      inchlib.events.column_dendrogram_node_onclick = function (
        column_indexes
      ) {
        const selectedGenesTemp = Object.keys(column_indexes).map(
          (gene) => inchlib.data?.feature_names[gene].split("_")[0]
        );

        if (selectedGenesTemp.length > 3) setSelectedGenes(selectedGenesTemp);
      };

      inchlib.events.dendrogram_node_onclick = function (object_ids) {
        setSelectedGenes(object_ids.map((gene) => gene.split("_")[0]));
        inchlib.highlight_rows([]);
      };

      inchlib.events.empty_space_onclick = function () {
        inchlib.highlight_rows([]);
        inchlib.unhighlight_cluster();
      };

      return () => {
        // Clean up event handlers
        if (inchlibInstance.current) {
          inchlibInstance.current.events.row_onclick = null;
          inchlibInstance.current.events.column_dendrogram_node_onclick = null;
          inchlibInstance.current.events.dendrogram_node_onclick = null;
          inchlibInstance.current.events.empty_space_onclick = null;
          inchlibInstance.current = null;
        }
      };
    }
  }, []);

  useEffect(() => {
    setLoading(calcResults?.["corrCluster"]?.running);
  }, [calcResults?.["corrCluster"]?.running]);

  // Initialize InCHlib when graphData changes
  useEffect(() => {
    if (!graphData || !inchlibInstance.current) return;

    const drawHeatmap = () => {
      setLoading(true);

      const instance = inchlibInstance.current;
      instance.read_data(graphData);
      instance.update_settings({
        width: heatmapWidth,
        heatmap: true,
        max_height: heatmapWidth,
        heatmap_header: true,
      });
      instance.draw();

      // If same order is required
      if (correlationSettings?.row_col_sameorder) {
        let coordinates = Object.entries(instance.leaves_y_coordinates).sort(
          (a, b) => a[1] - b[1]
        );

        /*const valueKeyMap = new Map();
        for (const [key, value] of Object.entries(instance.objects2leaves)) {
          valueKeyMap.set(value, key);
        }
          
        */
        const valueKeyMap = new Map(
          Object.entries(instance.objects2leaves).map(([k, v]) => [v, k])
        );

        /*
        let genesInRows = [];
        for (let key in coordinates) {
          genesInRows.push(valueKeyMap.get(coordinates[key][0]));
        }

        for (let key in graphData.data.feature_names) {
          valueKeyMap.set(graphData.data.feature_names[key], key);
        }

        let columnOrder = [];
        for (let key in genesInRows) {
          columnOrder.push(valueKeyMap.get(genesInRows[key]));
        }
        */

        const columnOrder = coordinates
          .map(([key]) => valueKeyMap.get(key))
          .reverse()
          .map((gene) =>
            graphData.data.feature_names.findIndex((f) => f === gene)
          );

        instance.update_settings({
          columns_order: columnOrder.reverse(),
          column_dendrogram: true,
          heatmap: true,
          //column_dendrogram: false,
        });
        instance.redraw();
      }
      handleFitToScreen();
      setLoading(false);
    };

    drawHeatmap();
  }, [graphData, correlationSettings?.row_col_sameorder, heatmapWidth]);

  // Handle zoom reset and fit to screen via react-zoom-pan-pinch
  const handleResetZoom = useCallback(() => {
    transformWrapperRef.current?.resetTransform();
  }, []);

  /*
  const handleFitToScreen = () => {
    if (transformWrapperRef.current) {
      const container = heatmapContainerRef.current;
      if (container && heatmapRef.current) {
        const containerRect = container.getBoundingClientRect();
        const heatmapRect = heatmapRef.current.getBoundingClientRect();
        // Calculate scale factors based on container size
        const scaleX =
          (containerRect.width - 50) / heatmapRef.current.clientWidth;
        //const scaleY = containerRect.height / heatmapRef.current.clientHeight;

        // Choose the smaller scale to fit both dimensions
        //const newScale = Math.min(scaleX, scaleY);

        // Align to the left and top

        // Apply the transformation
        transformWrapperRef.current.setTransform(0, 0, scaleX);
      }
    }
  };
  */

  const handleFitToScreen = useCallback(() => {
    const container = heatmapContainerRef.current;
    const heatmap = heatmapRef.current;

    if (container && heatmap) {
      const containerWidth = container.offsetWidth - 50;
      const scale = containerWidth / heatmap.offsetWidth;
      transformWrapperRef.current?.setTransform(0, 0, scale);
    }
  }, []);

  // Resize observer for responsive adjustments
  useEffect(() => {
    if (!heatmapContainerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(
      throttle(() => handleFitToScreen(), 200)
    );

    resizeObserverRef.current.observe(heatmapContainerRef.current);
    return () => resizeObserverRef.current?.disconnect();
  }, [handleFitToScreen]);

  return (
    <>
      {loading && <LoadingPage />}
      <>
        <div
          style={{ visibility: loading ? "hidden" : "visible" }}
          className={styles.mainView}
          ref={heatmapContainerRef}
        >
          {/* Control Bar */}
          <div className={styles.controlBar}>
            {/* ButtonGroup for Chart and Table */}
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

            {/* Instructional Text and Zoom Buttons */}

            <div
              className={styles.controlGroup}
              style={{
                visibility:
                  selectedView === 0 && loading === false
                    ? "visible"
                    : "hidden",
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
                  onClick={handleFitToScreen}
                  className={styles.zoomButton}
                  aria-label="Fit to Screen"
                >
                  FIT TO SCREEN
                </button>
              </div>
            </div>
          </div>
          {/* Spacer */}
          <Spacer height={5} />
          {/* Conditional Rendering for Table View */}
          {keyedData && selectedView === 1 && (
            <div className={styles.geneTable}>
              <EnrichmentTable data={keyedData} columns={columns} />
            </div>
          )}
          {/* Heatmap and Protein Div */}
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
                initialScale={1}
                minScale={0.125}
                maxScale={4}
                initialPositionX={0} // Align to left
                initialPositionY={0} // Align to top
                limitToBounds={false}
                ref={transformWrapperRef}
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: true }}
                pinch={{ step: 0.1 }}
                zoomAnimation={{ disabled: true }}
                className={styles.transformWrapper}
              >
                {({ zoomIn, zoomOut, resetTransform, fitToBounds }) => (
                  <React.Fragment>
                    <TransformComponent>
                      <div
                        id="heatmap"
                        style={{
                          height: "calc(100vh + 100px)",
                          minHeight: "800px",
                          marginBottom: "10px",
                        }}
                        ref={heatmapRef}
                      ></div>
                    </TransformComponent>
                  </React.Fragment>
                )}
              </TransformWrapper>
            </div>
            {/* Protein Div */}
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
