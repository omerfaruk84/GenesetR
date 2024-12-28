import React, { useEffect, useState, useMemo, useRef } from "react";
import InCHlib from "../../store/extra/inchlib-1.2.0.js";
import styles from "./heat-map.module.scss";
import { GeneSetEnrichmentTable } from "../enrichment/index.jsx";
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../enrichment-table-new/index.jsx";
import { connect } from "react-redux";
import { Spacer, ButtonGroup } from "@oliasoft-open-source/react-ui-library";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const HeatMap = ({ graphData, correlationSettings, inchlibSettings }) => {
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedView, setSelectedView] = useState(0);
  const [keyedData, setKeyedData] = useState([]);
  const [loading, setLoading] = useState(true);

  const heatmapContainerRef = useRef(null);
  const heatmapRef = useRef(null);
  const inchlibInstance = useRef(null);
  const transformWrapperRef = useRef(null);

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

  const heatmapWidth = useMemo(() => {
    if (graphData) {
      return Math.min(
        Math.max(graphData.data.feature_names.length * 42, 400),
        3500
      );
    }
    return 400;
  }, [graphData]);

  // Populate the table data based on correlation settings
  useEffect(() => {
    if (graphData?.data?.nodes) {
      const tableInfo = [];
      for (let i in graphData.data.nodes) {
        if (graphData.data.nodes[i].count === 1) {
          let gene1 = graphData.data.nodes[i].objects[0];
          for (let j in graphData.data.nodes[i].features) {
            const value = graphData.data.nodes[i].features[j];
            if (graphData.data.feature_names[j] !== gene1) {
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
      inchlibInstance.current.updateCellColors(inchlibSettings.color_scale);
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
      console.log(inchlibSettings.color_percentile);
      inchlibInstance.current.updateCellColorsPercentile(
        inchlibSettings.color_percentile
      );
    }
  }, [
    inchlibSettings.color_percentile.minValue,
    inchlibSettings.color_percentile.maxValue,
    inchlibSettings.color_scale,
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
      console.log(inchlibSettings.show_row_dendrogram);
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

  // Initialize InCHlib when graphData changes
  useEffect(() => {
    if (graphData && heatmapRef.current) {
      setLoading(true);

      // Initialize InCHlib with the correct target selector
      const inchlib = new InCHlib({
        target: "heatmap", // Corrected target as a string selector
        metadata: false,
        column_metadata: false,
        column_dendrogram: true,
        max_height: heatmapWidth,
        dendrogram: true,
        width: heatmapWidth,
        heatmap_colors: "BuWhRd",
        metadata_colors: "Reds",
        independent_columns: false,
        draw_row_ids:
          (graphData?.data?.nodes?.length ?? 0) > 120 ? false : true,
        heatmap_part_width: 0.95,
        max_column_width: 30,
        max_row_height: 30,
        heatmap: false,
        fixed_row_id_size: (graphData?.data?.nodes?.length ?? 0) > 120 ? 0 : 16,
      });

      inchlibInstance.current = inchlib;
      inchlib.read_data(graphData);
      inchlib.draw();

      // If same order is required
      if (correlationSettings?.row_col_sameorder) {
        let coordinates = Object.entries(inchlib.leaves_y_coordinates).sort(
          (a, b) => a[1] - b[1]
        );
        let genesInRows = [];

        const valueKeyMap = new Map();
        for (const [key, value] of Object.entries(inchlib.objects2leaves)) {
          valueKeyMap.set(value, key);
        }

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

        inchlib.update_settings({
          columns_order: columnOrder.reverse(),
          column_dendrogram: true,
          heatmap: true,
          //column_dendrogram: false,
        });
        inchlib.redraw();
      }

      // Attach Event Handlers
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

      // Hide loading after rendering
      setLoading(false);

      // Measure the heatmap after rendering if needed
      const measureHeatmap = () => {
        if (heatmapRef.current) {
          const rect = heatmapRef.current.getBoundingClientRect();
          console.log("Heatmap dimensions:", rect.width, rect.height);
          // You can use rect.width and rect.height if needed
        }
      };

      setTimeout(measureHeatmap, 0);

      return () => {
        // Clean up event handlers
        inchlib.events.row_onclick = null;
        inchlib.events.column_dendrogram_node_onclick = null;
        inchlib.events.dendrogram_node_onclick = null;
        inchlib.events.empty_space_onclick = null;
        inchlibInstance.current = null;
      };
    }
  }, [graphData, correlationSettings?.row_col_sameorder, heatmapWidth]);

  // Handle zoom reset and fit to screen via react-zoom-pan-pinch
  const handleResetZoom = () => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.resetTransform();
      transformWrapperRef.current.setTransform(0, 0, 1);
    }
  };

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
        console.log(
          scaleX,
          //scaleY,
          containerRect.width,
          window.innerWidth,
          heatmapRect.width,
          containerRect.height,
          window.innerHeight,
          graphData
        );

        // Choose the smaller scale to fit both dimensions
        //const newScale = Math.min(scaleX, scaleY);

        // Align to the left and top
        const x = 0;
        const y = 0;

        // Apply the transformation
        transformWrapperRef.current.setTransform(x, y, scaleX);
      }
    }
  };

  return (
    <div className={styles.mainView} ref={heatmapContainerRef}>
      {/* Control Bar */}
      <div className={styles.controlBar}>
        {/* ButtonGroup for Chart and Table */}
        <ButtonGroup
          items={[
            {
              icon: <FaChartBar />,
              key: 0,
              label: "Chart",
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
          style={{ visibility: selectedView === 0 }}
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
                <div id="heatmap" ref={heatmapRef}></div>
              </TransformComponent>
            </React.Fragment>
          )}
        </TransformWrapper>

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
              <GeneSetEnrichmentTable
                genesets={{ "Selected Genes": selectedGenes.join(", ") }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = ({ settings }) => ({
  correlationSettings: settings?.correlation ?? {},
  inchlibSettings: settings?.inchlib ?? {},
});

const MainContainer = connect(mapStateToProps)(HeatMap);

export { MainContainer as HeatMap };
