import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { connect } from "react-redux";
import { safeJsonParse } from "../../utils/jsonUtils";
import { createGeneTooltipFormatter } from "../../utils/geneFunctionUtils";

import { GeneSetEnrichmentTable } from "../enrichment/";
import "echarts-gl";
import * as echarts from "echarts/core";
import { registerTransform } from "echarts/core";
//import GraphChart from 'echarts/charts';
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";
import { transform } from "echarts-stat";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { withErrorBoundary } from "../error-boundary";

import {
  GridComponent,
  BrushComponent,
  LegendPlainComponent,
  LegendScrollComponent,
  VisualMapComponent,
  TransformComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
} from "echarts/components";
import {
  CanvasRenderer,
  // SVGRenderer,
} from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import $, { param } from "jquery";
import { string } from "prop-types";
import { Panel, Toolbar, ToolbarButton } from "../ui";
import { haloLabel, saveImageFeature, useChartTheme } from "../../utils/chartTheme";
import styles from "./scatter-plot.module.scss";
import { PlotHelp } from "../plot-help";
import { SendToMenu } from "../send-to";
// import text from './sample.json';

echarts.use([
  TitleComponent,
  EffectScatterChart,
  LegendPlainComponent,
  LegendScrollComponent,
  CustomChart,
  BrushComponent,
  VisualMapComponent,
  TransformComponent,
  TooltipComponent,
  GridComponent,
  ScatterChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

registerTransform(transform.clustering);

const isDevEnv = process.env.NODE_ENV !== "production";

// Cluster colours. Entry 0 is the grey of unclustered points; clusters cycle
// through the rest. The dark set is the same hues, lightened to stay readable
// on a dark background (cluster i keeps its hue in both themes).
const CLUSTER_COLORS = {
  light: [
    "#aab0ba", "#37A2DA", "#e06343", "#37a354", "#b55dba", "#b5bd48", "#8378EA", "#96BFFF", "#00429d",
    "#ff7f0e", "#006d2c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#f032e6", "#bcbd22", "#17becf",
  ],
  dark: [
    "#788290", "#4db3e6", "#f0806a", "#4cc26c", "#cd7fd2", "#c9d15c", "#9d94f5", "#a9cbff", "#5b8de0",
    "#ff9a3d", "#3fae68", "#f0595a", "#b08fd8", "#b98478", "#f09ad5", "#f562ec", "#d4d54a", "#3fd3e2",
  ],
};

const ScatterPlot = ({
  graphData,
  scatterplotSettings,
  coreSettings,
  coreSettingsChanged,
  precomputedDrSettings,
}) => {
  const [options, setOptions] = useState({});
  const chartTheme = useChartTheme();
  const p = chartTheme.p;
  const [searchGene, setSearchGene] = useState("");
  // Gene found by "Search & Zoom": { gene, index, x: [min,max], y, z }
  const [focus, setFocus] = useState(null);
  const chartInstanceRef = useRef(null);
  // Genes inside the brush drawn on the 2D plot (toolbox: rectangle / polygon)
  const [brushedGenes, setBrushedGenes] = useState([]);
  // Axis titles follow the method that produced the embedding
  const axisPrefix =
    { pca: "PC", umap: "UMAP", tsne: "t-SNE", mde: "MDE" }[
      String(coreSettings?.currentModule || "").toLowerCase()
    ] || "Component";
  const highlightTimeoutRef = useRef(null);

  // A search result belongs to one dataset/result only.
  useEffect(() => {
    setFocus(null);
  }, [graphData]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      chartInstanceRef.current = null;
    };
  }, []);

  const getMinMax = (values) => {
    if (!Array.isArray(values) || values.length === 0) return [0, 0];
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value == null || Number.isNaN(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0];
    return [min, max];
  };

  // Memoize expensive gene processing
  const genesTolabel = useMemo(() => {
    const genes = String(scatterplotSettings.genesTolabel || "")
      .split(/[\s,;]+/)
      .map((gene) => gene.trim().toUpperCase())
      .filter(Boolean);
    return new Set(genes);
  }, [scatterplotSettings.genesTolabel]);

  // Case-insensitive "should this point be labelled" check.
  const isLabelledGene = (name) =>
    name !== null &&
    name !== undefined &&
    genesTolabel.has(String(name).toUpperCase());

  // Memoize data processing
  const processedData = useMemo(() => {
    // Check if we should color by cell line
    const colorBy = precomputedDrSettings?.colorBy || "cluster";
    // In 'genes' mode, cellLines should be None/empty - samples don't belong to specific cell lines
    // Only allow cell line coloring if cellLines is a valid array with actual values
    const hasCellLines = graphData?.cellLines && 
                        Array.isArray(graphData.cellLines) && 
                        graphData.cellLines.length > 0 &&
                        graphData.cellLines.some(cl => cl !== null && cl !== undefined && cl !== "");
    const shouldColorByCellLine = colorBy === "cellLine" && hasCellLines;
    
    const data = shouldColorByCellLine 
      ? [["PC1", "PC2", "PC3", "GeneSymbol", "CellLine", "Cluster", "ClusterProb"]]
      : [["PC1", "PC2", "PC3", "GeneSymbol", "Cluster", "ClusterProb"]];
    var pieces = [];
    const clusterData = [];
    const minandmax = [0, 0, 0, 0, 0, 0];
    const clusters = {};

    const COLOR_ALL = CLUSTER_COLORS[p.mode] || CLUSTER_COLORS.light;
    // Entry 0 is the grey of unclustered points; clusters cycle through the rest.
    const clusterColor = (index) => COLOR_ALL[1 + (index % (COLOR_ALL.length - 1))];

    let graphdata = graphData;
    
    if (isDevEnv) {
      console.log('ScatterPlot - Received graphData:', graphdata);
      console.log('ScatterPlot - Data structure check:', {
        hasGraphData: !!graphdata,
        hasPC1: !!graphdata?.["PC1"],
        hasPC2: !!graphdata?.["PC2"],
        hasGeneSymbols: !!graphdata?.["GeneSymbols"],
        pc1Length: graphdata?.["PC1"]?.length,
        pc2Length: graphdata?.["PC2"]?.length,
        geneSymbolsLength: graphdata?.["GeneSymbols"]?.length,
      });
    }
    
    if (
      !graphdata ||
      !graphdata["PC1"] ||
      !graphdata["PC2"] ||
      !graphdata["GeneSymbols"]
    ) {
      if (isDevEnv) {
        console.log('ScatterPlot - Data validation failed, returning empty data');
      }
      return { data, pieces, clusterData, minandmax, clusters };
    }

    // Calculate min/max for PC1
    var lowest = Number.POSITIVE_INFINITY;
    var highest = Number.NEGATIVE_INFINITY;
    var tmp;
    for (let i = graphdata["PC1"].length - 1; i >= 0; i--) {
      tmp = graphdata["PC1"][i];
      if (tmp < lowest) lowest = tmp;
      if (tmp > highest) highest = tmp;
    }

    minandmax[0] = lowest;
    minandmax[1] = highest;

    // Calculate min/max for PC2
    lowest = Number.POSITIVE_INFINITY;
    highest = Number.NEGATIVE_INFINITY;
    for (let i = graphdata["PC2"].length - 1; i >= 0; i--) {
      tmp = graphdata["PC2"][i];
      if (tmp < lowest) lowest = tmp;
      if (tmp > highest) highest = tmp;
    }

    minandmax[2] = lowest;
    minandmax[3] = highest;

    // Calculate min/max for PC3 if exists
    if (graphdata["PC3"]) {
      lowest = Number.POSITIVE_INFINITY;
      highest = Number.NEGATIVE_INFINITY;
      for (let i = graphdata["PC3"].length - 1; i >= 0; i--) {
        tmp = graphdata["PC3"][i];
        if (tmp < lowest) lowest = tmp;
        if (tmp > highest) highest = tmp;
      }
      minandmax[4] = lowest;
      minandmax[5] = highest;
    }

    // Cell line color mapping
    const cellLineColors = {
      "K562gwps": p.series[0],
      "HEK293gwps": p.series[1],
      "HCT116gwps": p.series[2],
    };
    
    const cellLineNames = {
      "K562gwps": "K562",
      "HEK293gwps": "HEK293",
      "HCT116gwps": "HCT116",
    };
    
    // Process data based on coloring mode
    if (shouldColorByCellLine) {
      // Color by cell line
      const uniqueCellLines = [...new Set(graphdata["cellLines"])].sort();
      
      // Create pieces for cell lines
      uniqueCellLines.forEach((cellLine, idx) => {
        pieces.push({
          value: cellLine,
          label: cellLineNames[cellLine] || cellLine,
          color: cellLineColors[cellLine] || COLOR_ALL[idx % COLOR_ALL.length],
          symbolSize: scatterplotSettings.symbolSize,
          symbol: "circle",
        });
      });
      
      // Build data array with cell line info
      for (let i = 0; i < graphdata["GeneSymbols"].length; i++) {
        const cellLine = graphdata["cellLines"][i];
        data.push([
          graphdata["PC1"][i],
          graphdata["PC2"][i],
          graphdata["PC3"][i] || "",
          graphdata["GeneSymbols"][i],
          cellLine,
          graphdata["clusterLabels"]?.[i] ?? -1,
          graphdata["clusterProb"]?.[i] ?? 1,
        ]);
      }
      
      // Still collect clusters for enrichment table
      if (graphdata["clusterCount"] > 0) {
        let arrayOfArrays = Array.from(
          Array(graphdata["clusterCount"]),
          () => []
        );
        for (var i = 0; i < graphdata["GeneSymbols"].length; i++) {
          if (graphdata["clusterLabels"][i] > -1) {
            arrayOfArrays[graphdata["clusterLabels"][i]]?.push(
              graphdata["GeneSymbols"][i]
            );
          }
        }
        for (let i = 0; i < arrayOfArrays.length; i++) {
          clusters["Cluster" + (i + 1)] = arrayOfArrays[i].join();
        }
      }
    } else {
      // Color by cluster (original behavior)
      if (graphdata["clusterCount"] > 0) {
        let arrayOfArrays = Array.from(
          Array(graphdata["clusterCount"]),
          () => []
        );
        
        for (var i = 0; i < Object.keys(graphdata["GeneSymbols"]).length; i++) {
          //collect the clusters
          if (graphdata["clusterLabels"][i] > -1) {
            arrayOfArrays[graphdata["clusterLabels"][i]]?.push(
              graphdata["GeneSymbols"][i]
            );
          }

          data.push([
            graphdata["PC1"][i],
            graphdata["PC2"][i],
            graphdata["PC3"][i],
            graphdata["GeneSymbols"][i],
            graphdata["clusterLabels"][i],
            graphdata["clusterProb"][i],
          ]);
        }

        //clusters = {}
        for (let i = 0; i < arrayOfArrays.length; i++) {
          clusters["Cluster" + (i + 1)] = arrayOfArrays[i].join();
        }
      } else {
        for (let i = 0; i < Object.keys(graphdata["GeneSymbols"]).length; i++) {
          data.push([
            graphdata["PC1"][i] ?? 0,
            graphdata["PC2"][i] ?? 0,
            graphdata["PC3"][i] ?? 0,
            graphdata["GeneSymbols"][i] ?? 0,
            -1,
            1,
          ]);
        }
      }
    }

    // Create pieces for clusters (if not coloring by cell line)
    if (!shouldColorByCellLine) {
      if (graphdata["clusterCount"] > 0) {
        for (let i = -1; i < graphdata["clusterCount"]; i++) {
          if (i === -1) {
            pieces.push({
              value: i,
              label: "Unclustered",
              color: COLOR_ALL[0],
              symbolSize: scatterplotSettings.symbolSize,
              symbol: "circle",
            });
            continue;
          }

          pieces.push({
            value: i,
            label: "Cluster " + (i + 1),
            color: clusterColor(i),
            symbolSize: scatterplotSettings.symbolSize,
            symbol: "circle",
          });

          if (
            graphdata["x" + i] &&
            graphdata["x" + i].length > 0 &&
            graphdata["y" + i] &&
            graphdata["y" + i].length > 0
          ) {
            clusterData.push([i / 10000]);
          }
        }
      } //if there is no cluster we will have all of them same color
      else {
        pieces.push({
          value: -1,
          label: "Unclustered",
          color: COLOR_ALL[1],
        });
      }
    }

    return { data, pieces, clusterData, minandmax, clusters, COLOR_ALL, clusterColor, shouldColorByCellLine };
  }, [graphData, scatterplotSettings.symbolSize, precomputedDrSettings?.colorBy, p]);

  const data = processedData.data;
  const pieces = processedData.pieces;
  const clusterData = processedData.clusterData;
  const minandmax = processedData.minandmax;
  const clusters = processedData.clusters;
  const COLOR_ALL = processedData.COLOR_ALL;
  const clusterColor = processedData.clusterColor;
  const shouldColorByCellLine = processedData.shouldColorByCellLine;

  useEffect(() => {
    function renderItem(params, api) {
      // The cluster index is stored as i / 10000; multiplying back is not exact
      // in floating point (3 / 10000 * 10000 = 3.0000000000000004), so round.
      var curIndex = Math.round(api.value(0) * 10000);

      const points = [];
      if (graphData["x" + curIndex]) {
        for (var i = 0; i < graphData["x" + curIndex].length; i++) {
          points.push(
            api.coord([
              graphData["x" + curIndex][i],
              graphData["y" + curIndex][i],
            ])
          );
        }
      }

      var color = clusterColor(curIndex);

      return {
        type: "polygon",
        shape: {
          points: echarts.graphic.clipPointsByRect(points, {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height,
          }),
          smooth: 1,
        },
        style: api.style({
          fill: color,
          stroke: echarts.color.lift(color),
        }),
      };
    }

    // Determine if we should show 2D or 3D
    // Use 3D if PC3 is available and graphType is not explicitly "2D"
    const hasPC3 = graphData?.PC3 && Array.isArray(graphData.PC3) && graphData.PC3.length > 0 && graphData.PC3.some(v => v !== "" && v != null);
    const use2D = coreSettings.graphType === "2D" || !hasPC3;

    // Axis window: zoomed around the searched gene, otherwise data range + 10%.
    const axisRange = (focusWindow, lo, hi) =>
      Array.isArray(focusWindow)
        ? { min: focusWindow[0], max: focusWindow[1] }
        : { min: lo - (hi - lo) * 0.1, max: hi + (hi - lo) * 0.1 };
    const xRange = axisRange(focus?.x, minandmax[0], minandmax[1]);
    const yRange = axisRange(focus?.y, minandmax[2], minandmax[3]);
    const zRange = axisRange(focus?.z, minandmax[4], minandmax[5]);
    const focusGene = focus?.gene;

    if (use2D) {
      //2D chart
      setOptions({
        dataset: [
          {
            source: data,
          },
          {
            source: clusterData,
          },
        ],

        tooltip: {
          position: "top",
          extraCssText: "width:auto; white-space:pre-wrap; max-width: 400px; line-height: 1.4;",
          confine: true,
          textStyle: {
            fontSize: 13,
            lineHeight: 1.4,
          },
          formatter: createGeneTooltipFormatter({
            parseData: (params) => {
              if (shouldColorByCellLine) {
                // When coloring by cell line, data structure is: [PC1, PC2, PC3, GeneSymbol, CellLine, Cluster, ClusterProb]
                const cellLineNames = {
                  "K562gwps": "K562",
                  "HEK293gwps": "HEK293",
                  "HCT116gwps": "HCT116",
                };
                return {
                  geneSymbol: params.data[3],
                  cellLine: cellLineNames[params.data[4]] || params.data[4],
                  cluster: params.data[5],
                  clusterProb: params.data[6],
                  neighbourCount: undefined,
                  geneType: undefined,
                  knockdown: undefined
                };
              } else {
                // Original structure: [PC1, PC2, PC3, GeneSymbol, Cluster, ClusterProb]
                return {
                  geneSymbol: params.data[3],
                  cluster: params.data[4],
                  clusterProb: params.data[5],
                  cellLine: undefined,
                  neighbourCount: undefined,
                  geneType: undefined,
                  knockdown: undefined
                };
              }
            }
          }),
        },
        visualMap: {
          type: "piecewise",
          top: 44,
          right: 8,
          dimension: shouldColorByCellLine ? 4 : 4, // CellLine or Cluster is at index 4
          pieces: pieces,
          orient: "vertical",
          seriesIndex: 1,
          inverse: true,
          itemGap: 6,
          itemWidth: 12,
          itemHeight: 12,
          itemSymbol: "circle",
          align: "left",
          textStyle: { color: p.text, fontSize: 12 },
        },
        grid: {
          left: 70,
          right: 130,
          top: 44,
          bottom: 56,
        },
        xAxis: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
          },
          nameLocation: "center",
          nameTextStyle: {
            fontWeight: 600,
            fontSize: 14,
          },
          name: `${axisPrefix} 1`,
          nameGap: 30,
          min: xRange.min,
          max: xRange.max,
        },

        yAxis: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
          },
          nameRotate: 90,
          scale: true,
          name: `${axisPrefix} 2`,
          nameLocation: "center",
          nameGap: 50,
          nameTextStyle: {
            fontWeight: 600,
            fontSize: 14,
          },
          min: yRange.min,
          max: yRange.max,
        },
        toolbox: {
          show: true,
          right: 8,
          feature: {
            mark: { show: true },
            dataView: { show: true, readOnly: false },
            restore: { show: true },
            saveAsImage: saveImageFeature(p, "genesetr-embedding"),
            mySvg: svgToolboxFeature("genesetr-embedding"),
            myPdf: pdfToolboxFeature("genesetr-embedding"),
            dataZoom: {},
            brush: {
              type: ["rect", "polygon", "keep", "clear"],
            },
          },
        },
        brush: {},

        series: [
          {
            type: "custom",
            renderItem: renderItem,
            itemStyle: {
              opacity: scatterplotSettings.highlightClusters === true ? 0.5 : 0,
            },
            //gridIndex: 1,

            animation: false,
            silent: true,
            datasetIndex: 1,
            emphasis: {
              focus: "series",
            },
            brush: {},
          },
          {
            type: "scatter",
            gridIndex: 0,
            symbolSize: scatterplotSettings.symbolSize,
            itemGroupId: 4,
            datasetIndex: 0,
            // Thousands of points (the all-genes embeddings): no entry animation.
            animation: data.length < 3000,
            labelLayout: { hideOverlap: true },
            label: {
              // A label element per point is costly, so only when labels are asked for.
              show:
                scatterplotSettings.showLabels === true ||
                genesTolabel.size > 0 ||
                focusGene !== undefined,
              position: scatterplotSettings.labelLoc,
              fontSize: scatterplotSettings.labelSize,
              formatter: function (params) {
                const name = params.data[3];
                if (focusGene !== undefined && name === focusGene) {
                  // Searched gene: always labelled, emphasised
                  return "{focus|" + name + "}";
                }
                if (
                  scatterplotSettings.showLabels === true ||
                  isLabelledGene(name)
                ) {
                  return name;
                } else return "";
              },
              rich: {
                focus: {
                  color: p.accent,
                  fontWeight: "bold",
                  fontSize: 18,
                  textBorderColor: p.bg,
                  textBorderWidth: 3,
                },
              },
              ...haloLabel(p),
            },
            emphasis: {
              itemStyle: { borderColor: p.text, borderWidth: 1.5 },
            },
          },
        ],
      });
    } else if (hasPC3) {
      //3D chart (only if PC3 is available)
      // echarts-gl does not read the registered theme: colours are set here
      const axis3D = {
        axisLabel: {
          formatter: function (value) {
            return value.toFixed(2);
          },
          textStyle: { color: p.muted, fontSize: 12 },
        },
        nameTextStyle: { fontWeight: 600, fontSize: 14, color: p.text },
        axisLine: { lineStyle: { color: p.axis } },
        axisTick: { lineStyle: { color: p.axis } },
        splitLine: { lineStyle: { color: p.grid } },
        axisPointer: { lineStyle: { color: p.axis } },
      };
      setOptions({
        grid3D: {
          environment: p.bg,
          viewControl: {
            autoRotate: scatterplotSettings.autorotate,
            autoRotateSpeed: scatterplotSettings.rotationSpeed,
            projection:
              scatterplotSettings.projection === false
                ? "perspective"
                : "orthographic",
          },
        },

        xAxis3D: {
          ...axis3D,
          name: `${axisPrefix} 1`,
          nameGap: 25,
          min: xRange.min,
          max: xRange.max,
        },
        yAxis3D: {
          ...axis3D,
          scale: true,
          name: `${axisPrefix} 2`,

          min: yRange.min,
          max: yRange.max,
        },
        zAxis3D: {
          ...axis3D,
          scale: true,
          name: `${axisPrefix} 3`,

          min: zRange.min,
          max: zRange.max,
        },

        visualMap: {
          type: "piecewise",
          top: "bottom",
          left: "center",
          dimension: 4,
          pieces: pieces,
          orient: "horizontal",
          itemSymbol: "circle",
          textStyle: { color: p.text, fontSize: 12 },
        },
        label: {
          formatter: "{GeneSymbol}",
        },
        tooltip: {
          extraCssText: "width:auto; white-space:pre-wrap; max-width: 400px; line-height: 1.4;",
          confine: true,
          textStyle: {
            fontSize: 13,
            lineHeight: 1.4,
          },
          formatter: createGeneTooltipFormatter({
            // Rows are [PC1, PC2, PC3, Gene, Cluster, Prob] or, when colouring
            // by cell line, [PC1, PC2, PC3, Gene, CellLine, Cluster, Prob].
            parseData: (params) =>
              shouldColorByCellLine
                ? {
                    geneSymbol: params.data[3],
                    cellLine:
                      {
                        K562gwps: "K562",
                        HEK293gwps: "HEK293",
                        HCT116gwps: "HCT116",
                      }[params.data[4]] || params.data[4],
                    cluster: params.data[5],
                    clusterProb: params.data[6],
                  }
                : {
                    geneSymbol: params.data[3],
                    cluster: params.data[4],
                    clusterProb: params.data[5],
                  },
          }),
        },
        dataset: {
          dimensions: shouldColorByCellLine
            ? [
                "PC1",
                "PC2",
                "PC3",
                "GeneSymbol",
                { name: "CellLine", type: "ordinal" },
                "Cluster",
                "ClusterProb",
              ]
            : [
                "PC1",
                "PC2",
                "PC3",
                "GeneSymbol",
                { name: "Cluster", type: "ordinal" },
                "ClusterProb",
              ],
          source: data,
        },
        toolbox: {
          show: true,
          feature: {
            mark: { show: true },
            dataView: { show: true, readOnly: false },
            restore: { show: true },
            saveAsImage: saveImageFeature(p, "genesetr-embedding"),
            mySvg: svgToolboxFeature("genesetr-embedding"),
            myPdf: pdfToolboxFeature("genesetr-embedding"),
          },
        },
        series: [
          {
            symbol: "circle",
            type: "scatter3D",
            symbolSize: scatterplotSettings.symbolSize,
            encode: {
              x: "PC1",
              y: "PC2",
              z: "PC3",
              tooltip: [0, 1, 2, 3, 4],
            },
            label: {
              show: true,
              fontSize: scatterplotSettings.labelSize,
              position: scatterplotSettings.labelLoc,
              textStyle: {
                color: p.text,
                fontSize: scatterplotSettings.labelSize,
                borderColor: p.bg,
                borderWidth: 2,
              },
              formatter: function (params) {
                const name = params.data[3];
                if (
                  scatterplotSettings.showLabels === true ||
                  (focusGene !== undefined && name === focusGene) ||
                  isLabelledGene(name)
                ) {
                  return name;
                } else return " ";
              },
            },
            emphasis: {
              itemStyle: {
                color: p.accent,
              },
            },
          },
        ],
      });
    }
    //}
  }, [coreSettings.graphType, coreSettings.currentModule, scatterplotSettings, graphData, shouldColorByCellLine, data, pieces, minandmax, clusterData, focus, genesTolabel, p]);

  // Search a gene: zoom the axes around it and emphasise its point/label.
  // The zoom window and the highlighted gene live in state so they survive
  // chart re-renders (the chart is redrawn with notMerge).
  const handleSearchGene = () => {
    if (!searchGene || !graphData || !Array.isArray(graphData.GeneSymbols)) {
      return;
    }

    const geneSymbol = searchGene.trim().toUpperCase();
    if (!geneSymbol) return;
    const geneIndex = graphData.GeneSymbols.findIndex(
      (g) => g && String(g).toUpperCase() === geneSymbol
    );

    if (geneIndex === -1) {
      toast({
        message: {
          type: "Warning",
          icon: true,
          content: `"${searchGene}" was not found in this plot`,
          details: "Check the spelling, or whether the gene was part of the submitted list.",
        },
      });
      return;
    }

    // Show 20% of the data range on each side of the gene
    const zoomRange = 0.2;
    const windowAround = (values) => {
      if (!Array.isArray(values)) return null;
      const [min, max] = getMinMax(values);
      const range = max - min;
      const centre = values[geneIndex];
      if (typeof centre !== "number" || !Number.isFinite(centre) || !(range > 0)) {
        return null;
      }
      return [centre - range * zoomRange, centre + range * zoomRange];
    };

    setFocus({
      gene: graphData.GeneSymbols[geneIndex],
      index: geneIndex,
      x: windowAround(graphData.PC1),
      y: windowAround(graphData.PC2),
      z: windowAround(graphData.PC3),
    });
  };

  // After the chart has redrawn for a search, emphasise the point and show
  // its tooltip. The scatter is series 1 in 2D (series 0 is the cluster hull
  // layer) and series 0 in 3D.
  useEffect(() => {
    if (!focus) return undefined;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      highlightTimeoutRef.current = null;
      const chartInstance = chartInstanceRef.current;
      if (
        !chartInstance ||
        (typeof chartInstance.isDisposed === "function" && chartInstance.isDisposed())
      ) {
        return;
      }
      try {
        const currentOption = chartInstance.getOption() || {};
        const is3D = Array.isArray(currentOption.grid3D) && currentOption.grid3D.length > 0;
        const seriesIndex = is3D ? 0 : 1;
        chartInstance.dispatchAction({
          type: "highlight",
          seriesIndex,
          dataIndex: focus.index,
        });
        if (!is3D) {
          chartInstance.dispatchAction({
            type: "showTip",
            seriesIndex,
            dataIndex: focus.index,
          });
        }
      } catch (e) {
        // Highlighting is cosmetic; never let it break the chart.
      }
    }, 400);

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [focus, options]);

  return (
    <div className={styles.wrap}>
      <Panel
        flush
        title="Embedding"
        subtitle={`${Math.max(0, data.length - 1).toLocaleString()} points`}
        actions={<PlotHelp kind="embedding" />}
      >
        {/* Gene search */}
        <Toolbar className={styles.searchBar}>
          <label className={styles.searchLabel} htmlFor="embedding-gene-search">
            Search gene
          </label>
          <input
            id="embedding-gene-search"
            type="text"
            className={styles.searchInput}
            value={searchGene}
            onChange={(e) => setSearchGene(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearchGene();
              }
            }}
            placeholder="Enter gene symbol (e.g., TP53)"
          />
          <ToolbarButton variant="primary" onClick={handleSearchGene}>
            Search & Zoom
          </ToolbarButton>
          {focus && (
            <ToolbarButton onClick={() => setFocus(null)}>
              Reset view
            </ToolbarButton>
          )}
          {brushedGenes.length > 0 && (
            <SendToMenu
              genes={brushedGenes}
              label={`Send ${brushedGenes.length} selected…`}
              defaultName="Embedding selection"
            />
          )}
        </Toolbar>
        <div className={styles.chart}>
          <ReactEChartsCore
            echarts={echarts}
            theme={chartTheme.theme}
            option={options}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
            onEvents={{
              // Row 0 of the dataset is its header, so point i is data[i + 1].
              brushselected: (event) => {
                const indices = (event?.batch?.[0]?.selected || []).flatMap((entry) => entry.dataIndex || []);
                const genes = Array.from(
                  new Set(indices.map((index) => data[index + 1]?.[3]).filter(Boolean).map(String))
                );
                setBrushedGenes((previous) =>
                  previous.length === genes.length && previous.every((gene, i) => gene === genes[i])
                    ? previous
                    : genes
                );
              },
            }}
            onChartReady={(instance) => {
              chartInstanceRef.current = instance;
            }}
          />
        </div>
      </Panel>
      {Object.keys(clusters).length > 0 && (
        <div className={styles.enrichment}>
          <GeneSetEnrichmentTable genesets={clusters} />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ settings }) => ({
  scatterplotSettings: settings?.scatterplot ?? {},
  coreSettings: settings?.core ?? {},
  precomputedDrSettings: settings?.precomputedDr ?? {},
});
const mapDispatchToProps = {
  coreSettingsChanged,
};

const ConnectedScatterPlot = connect(mapStateToProps, mapDispatchToProps)(ScatterPlot);

const MainContainer = withErrorBoundary(ConnectedScatterPlot, {
  label: "Scatter plot",
  resetKeys: (props) => [props.graphData],
});

export { MainContainer as ScatterPlot };
