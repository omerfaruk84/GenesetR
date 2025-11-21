import React, { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { Spacer, Row } from "@oliasoft-open-source/react-ui-library";
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

const ScatterPlot = ({
  graphData,
  scatterplotSettings,
  coreSettings,
  coreSettingsChanged,
  precomputedDrSettings,
}) => {
  const [options, setOptions] = useState({});
  const [searchGene, setSearchGene] = useState("");
  const [chartInstance, setChartInstance] = useState(null);

  // Memoize expensive gene processing
  const genesTolabel = useMemo(() => {
    const genes = scatterplotSettings.genesTolabel
      .replaceAll(/\s+|,\s+|,/g, ";")
      ?.split(";");
    return new Set(genes);
  }, [scatterplotSettings.genesTolabel]);

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

    var COLOR_ALL = [
      "#9b9b9b",
      "#37A2DA",
      "#e06343",
      "#37a354",
      "#b55dba",
      "#b5bd48",
      "#8378EA",
      "#96BFFF",
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
    ];

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
      "K562gwps": "#1f77b4",      // Blue
      "HEK293gwps": "#ff7f0e",    // Orange
      "HCT116gwps": "#2ca02c",    // Green
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
            arrayOfArrays[graphdata["clusterLabels"][i]].push(
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
            arrayOfArrays[graphdata["clusterLabels"][i]].push(
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
            color: COLOR_ALL[(i + 1) % 18],
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

    return { data, pieces, clusterData, minandmax, clusters, COLOR_ALL, shouldColorByCellLine };
  }, [graphData, scatterplotSettings.symbolSize, precomputedDrSettings?.colorBy]);

  const data = processedData.data;
  const pieces = processedData.pieces;
  const clusterData = processedData.clusterData;
  const minandmax = processedData.minandmax;
  const clusters = processedData.clusters;
  const COLOR_ALL = processedData.COLOR_ALL;
  const shouldColorByCellLine = processedData.shouldColorByCellLine;

  useEffect(() => {
    function renderItem(params, api) {
      var curIndex = api.value(0) * 10000;

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

      var color = COLOR_ALL[(curIndex + 1) % 18];

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
          backgroundColor: "#ffffff",
          borderColor: "#e0e0e0",
          borderWidth: 1,
          textStyle: {
            fontSize: 13,
            color: "#333333",
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
          top: "top",
          left: "right",
          dimension: shouldColorByCellLine ? 4 : 4, // CellLine or Cluster is at index 4
          pieces: pieces,
          orient: "vertical",
          seriesIndex: 1,
          //show:true,
          padding: [60, 5, 5, 5],
          inverse: true,
          itemGap: 5,
          align: "left",
        },
        grid: {
          right: "13%",
        },
        xAxis: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
            color: "black",
          },
          nameLocation: "center",
          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "15",
            color: "black",
          },
          name: "Component 1",
          nameGap: 25,
          min: minandmax[0] - (minandmax[1] - minandmax[0]) * 0.1,
          max: minandmax[1] + (minandmax[1] - minandmax[0]) * 0.1,
        },

        yAxis: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
            color: "black",
          },
          nameRotate: 90,
          scale: true,
          name: "Component 2",
          nameLocation: "center",
          nameGap: 50,
          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "15",
            verticalAlign: "center",
            color: "black",
          },
          min: minandmax[2] - (minandmax[3] - minandmax[2]) * 0.1,
          max: minandmax[3] + (minandmax[3] - minandmax[2]) * 0.1,
        },
        toolbox: {
          show: true,
          feature: {
            mark: { show: true },
            dataView: { show: true, readOnly: false },
            restore: { show: true },
            saveAsImage: { show: true, pixelRatio: 3 },
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
            emphasis: {
              focus: "self",
            },
            label: {
              show: true,
              position: scatterplotSettings.labelLoc,
              fontSize: scatterplotSettings.labelSize,
              formatter: function (params) {
                if (
                  scatterplotSettings.showLabels === true ||
                  genesTolabel.has(params.data[3])
                ) {
                  return params.data[3];
                } else return "";
              },

              // fontWeight: 'bold',
              color: "black",
            },
          },
        ],
      });
    } else if (hasPC3) {
      //3D chart (only if PC3 is available)
      setOptions({
        grid3D: {
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
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
            color: "black",
          },
          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "15",
            color: "black",
          },
          name: "Component 1",
          nameGap: 25,
          min: minandmax[0] - (minandmax[1] - minandmax[0]) * 0.1,
          max: minandmax[1] + (minandmax[1] - minandmax[0]) * 0.1,
        },
        yAxis3D: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
            color: "black",
          },
          scale: true,
          name: "Component 2",

          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "15",
            verticalAlign: "center",
            color: "black",
          },
          min: minandmax[2] - (minandmax[3] - minandmax[2]) * 0.1,
          max: minandmax[3] + (minandmax[3] - minandmax[2]) * 0.1,
        },
        zAxis3D: {
          axisLabel: {
            formatter: function (value) {
              return value.toFixed(2);
            },
            color: "black",
          },
          scale: true,
          name: "Component 3",

          nameTextStyle: {
            fontWeight: "bold",
            fontSize: "15",
            verticalAlign: "center",
            color: "black",
          },
          min: minandmax[4] - (minandmax[5] - minandmax[4]) * 0.1,
          max: minandmax[5] + (minandmax[5] - minandmax[4]) * 0.1,
        },

        visualMap: {
          type: "piecewise",
          top: "bottom",
          left: "center",
          dimension: 4,
          pieces: pieces,
          orient: "horizontal",
        },
        label: {
          formatter: "{GeneSymbol}",
        },
        tooltip: {
          extraCssText: "width:auto; white-space:pre-wrap; max-width: 400px; line-height: 1.4;",
          confine: true,
          backgroundColor: "#ffffff",
          borderColor: "#e0e0e0",
          borderWidth: 1,
          textStyle: {
            fontSize: 13,
            color: "#333333",
            lineHeight: 1.4,
          },
          formatter: createGeneTooltipFormatter({
            parseData: (params) => ({
              geneSymbol: params.data[3],
              cluster: params.data[4],
              clusterProb: params.data[5]
            })
          }),
        },
        dataset: {
          dimensions: [
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
            saveAsImage: { show: true },
            dataZoom: {},
            brush: {
              type: ["rect", "polygon", "keep", "clear"],
            },
          },
        },
        brush: {},
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
              formatter: function (params) {
                if (
                  scatterplotSettings.showLabels === true ||
                  genesTolabel.has(params.data[3])
                ) {
                  return params.data[3];
                } else return " ";
              },
            },
            emphasis: {
              itemStyle: {
                color: "red",
              },
            },
          },
        ],
      });
    }
    //}
  }, [coreSettings, scatterplotSettings, graphData, shouldColorByCellLine, data, pieces, minandmax, clusterData]);

  // Function to search and zoom to a gene
  const handleSearchGene = () => {
    if (!searchGene || !chartInstance || !graphData || !graphData.GeneSymbols) {
      return;
    }
    
    const geneSymbol = searchGene.trim().toUpperCase();
    const geneIndex = graphData.GeneSymbols.findIndex(
      (g) => g && g.toUpperCase() === geneSymbol
    );
    
    if (geneIndex === -1) {
      alert(`Gene "${searchGene}" not found in the dataset.`);
      return;
    }
    
    // Get the coordinates for this gene
    const pc1 = graphData.PC1[geneIndex];
    const pc2 = graphData.PC2[geneIndex];
    const pc3 = graphData.PC3 ? graphData.PC3[geneIndex] : 0;
    
    // Get current option
    const currentOption = chartInstance.getOption();
    
    // Calculate zoom range (show area around the gene)
    const zoomRange = 0.2; // Show 20% of the data range around the gene
    const pc1Min = Math.min(...graphData.PC1);
    const pc1Max = Math.max(...graphData.PC1);
    const pc2Min = Math.min(...graphData.PC2);
    const pc2Max = Math.max(...graphData.PC2);
    const pc3Min = graphData.PC3 ? Math.min(...graphData.PC3) : 0;
    const pc3Max = graphData.PC3 ? Math.max(...graphData.PC3) : 0;
    
    const pc1Range = pc1Max - pc1Min;
    const pc2Range = pc2Max - pc2Min;
    const pc3Range = pc3Max - pc3Min;
    const maxRange = Math.max(pc1Range, pc2Range, pc3Range);
    
    // Check if it's a 3D chart
    if (currentOption.grid3D && currentOption.grid3D[0]) {
      // 3D chart - update view control and axis ranges
      const newOption = {
        grid3D: [{
          ...currentOption.grid3D[0],
          viewControl: {
            ...currentOption.grid3D[0].viewControl,
            target: [pc1, pc2, pc3],
            distance: maxRange * 1.5, // Zoom in by reducing distance
          }
        }],
        xAxis3D: [{
          ...currentOption.xAxis3D[0],
          min: pc1 - pc1Range * zoomRange,
          max: pc1 + pc1Range * zoomRange,
        }],
        yAxis3D: [{
          ...currentOption.yAxis3D[0],
          min: pc2 - pc2Range * zoomRange,
          max: pc2 + pc2Range * zoomRange,
        }]
      };
      
      if (graphData.PC3 && currentOption.zAxis3D && currentOption.zAxis3D[0]) {
        newOption.zAxis3D = [{
          ...currentOption.zAxis3D[0],
          min: pc3 - pc3Range * zoomRange,
          max: pc3 + pc3Range * zoomRange,
        }];
      }
      
      chartInstance.setOption(newOption, false);
    } else {
      // 2D chart - use dataZoom
      chartInstance.dispatchAction({
        type: 'dataZoom',
        startValue: pc1 - pc1Range * zoomRange,
        endValue: pc1 + pc1Range * zoomRange,
        xAxisIndex: 0
      });
      
      chartInstance.dispatchAction({
        type: 'dataZoom',
        startValue: pc2 - pc2Range * zoomRange,
        endValue: pc2 + pc2Range * zoomRange,
        yAxisIndex: 0
      });
    }
    
    // Highlight the gene by selecting it and showing label
    // Use select action which works better with 3D charts
    setTimeout(() => {
      // Select the data point
      chartInstance.dispatchAction({
        type: 'select',
        seriesIndex: 0,
        dataIndex: geneIndex
      });
      
      // Show tooltip
      chartInstance.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex: geneIndex
      });
      
      // Update the series to show label for this specific gene
      const updatedOption = chartInstance.getOption();
      if (updatedOption.series && updatedOption.series[0]) {
        const highlightOption = {
          series: [{
            ...updatedOption.series[0],
            label: {
              ...updatedOption.series[0].label,
              show: true,
              formatter: function(params) {
                // Always show the searched gene label
                if (params.dataIndex === geneIndex) {
                  return graphData.GeneSymbols[geneIndex];
                }
                // Show other labels based on original logic
                const showLabels = scatterplotSettings?.showLabels === true;
                const geneSymbol = params.data && params.data[3] ? params.data[3] : '';
                if (showLabels || (geneSymbol && genesTolabel.has(geneSymbol))) {
                  return geneSymbol;
                }
                return ' ';
              },
              fontSize: function(params) {
                return params.dataIndex === geneIndex ? 18 : (scatterplotSettings?.labelSize || 12);
              },
              fontWeight: function(params) {
                return params.dataIndex === geneIndex ? 'bold' : 'normal';
              },
              color: function(params) {
                return params.dataIndex === geneIndex ? '#ff0000' : 'black';
              }
            },
            emphasis: {
              ...updatedOption.series[0].emphasis,
              itemStyle: {
                color: '#ff0000',
                borderColor: '#ff0000',
                borderWidth: 4,
                shadowBlur: 15,
                shadowColor: 'rgba(255, 0, 0, 0.9)'
              },
              label: {
                show: true,
                fontSize: 20,
                fontWeight: 'bold',
                color: '#ff0000'
              }
            },
            select: {
              itemStyle: {
                color: '#ff0000',
                borderColor: '#ff0000',
                borderWidth: 4,
                shadowBlur: 15,
                shadowColor: 'rgba(255, 0, 0, 0.9)'
              },
              label: {
                show: true,
                fontSize: 20,
                fontWeight: 'bold',
                color: '#ff0000'
              }
            }
          }]
        };
        
        chartInstance.setOption(highlightOption, false);
      }
    }, 300);
  };

  return (
    /*<EchartsReact
        option={options}
        style={{ height: '100%', width: '100%' }}
    />*/

    <>
      <div style={{ width: "100%", height: "100%" }}>
        {/* Gene Search Box */}
        <div style={{ 
          padding: "10px", 
          backgroundColor: "#f5f5f5", 
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <label style={{ fontWeight: "bold", marginRight: "5px" }}>Search Gene:</label>
          <input
            type="text"
            value={searchGene}
            onChange={(e) => setSearchGene(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearchGene();
              }
            }}
            placeholder="Enter gene symbol (e.g., TP53)"
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              flex: "1",
              maxWidth: "300px"
            }}
          />
          <button
            onClick={handleSearchGene}
            style={{
              padding: "6px 16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Search & Zoom
          </button>
        </div>
        <Row spacing={0} width="100%" height="80vh">
          <ReactEChartsCore
            echarts={echarts}
            option={options}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
            onChartReady={(chart) => {
              setChartInstance(chart);
            }}
          />
        </Row>
        <Spacer height="2em" />
        {Object.keys(clusters).length > 0 && (
          <Row spacing={-100} width="100%" height="90%">
            <GeneSetEnrichmentTable genesets={clusters} />
          </Row>
        )}
      </div>
    </>
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

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(ScatterPlot);

export { MainContainer as ScatterPlot };
