import React, { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import * as echarts from "echarts/core";
import { ButtonGroup } from "@oliasoft-open-source/react-ui-library";
import { GraphChart } from "echarts/charts";
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../../components/enrichment-table-new";
import { createGeneTooltipFormatter } from "../../utils/geneFunctionUtils";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import dagre from "dagre";
import styles from "./pathfinder.module.scss";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Add module description for PathFinder (Pathway Explorer)
const moduleDescription = {
  title: "Pathway Explorer",
  description: "This module maps pathways among submitted genes using GWPS data, particularly useful for RNA-seq data analyses. It examines down-regulated genes to determine which genes are up- or down-regulated following perturbation, creating pathway networks that reveal key regulatory relationships and interactions.",
  description2: "Interactive network shows regulatory relationships. Node sizes reflect the number of interaction partners (neighbours), node opacity shows knockdown efficiency, and edge width/color indicate effect strength (e.g a green arrow from gene A to gene B indicates that knockdown of gene A leads to down-regulation of gene B).",
  features: [
    "Maps regulatory pathways between submitted genes",
    "Identifies key nodes that mediate observed phenotypes", 
    "Visualizes gene-gene interactions with effect sizes",
    "Integrates correlation data from GWPS",
    "Integrates protein-protein interaction data from BioGRID"
  ],  
};

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  GraphChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

const PathFinder = ({ pathFinderGraph, pathfinderSettings, blacklistData }) => {
  //Import json file. Used in {options}.

  const [options, setOptions] = useState({});
  const [keyedData, setkeyedData] = useState([{}]);
  const [selectedView, setSelectedView] = useState(0);
  const columns = useMemo(
    () => [
      {
        id: "Regulation", //id used to define `group` column
        header: "Regulation",
        columns: [
          {
            accessorKey: "Regulation Type", //access nested data with dot notation
            header: "Regulation Type",
            Header: <>Type</>,
            size: 50,
            maxSize: 50,
            filterVariant: "select",
            muiFilterTextFieldProps: {
              placeholder: "Select",
              size: "small",
            },
          },
        ],
      },

      {
        id: "GeneSymbols", //id used to define `group` column
        header: "Gene Symbol",
        columns: [
          {
            accessorKey: "From", //normal accessorKey
            header: "Gene Symbol From",
            Header: <>From</>,
            size: 75,
            filterVariant: "autocomplete",
            minSize: 50, //min size enforced during resizing
            maxSize: 150,
            muiFilterTextFieldProps: {
              placeholder: "Symbol",
              size: "small",
            },
          },
          {
            accessorKey: "To",
            header: "Gene Symbol To",
            Header: <>To</>,
            size: 75,
            filterVariant: "autocomplete",
            muiFilterTextFieldProps: {
              placeholder: "Symbol",
              size: "small",
            },
          },
        ],
      },
      {
        id: "Z-Score", //id used to define `group` column
        header: "Z-Score",
        columns: [
          {
            accessorKey: "Score",
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
      },
      {
        id: "NeighbourCount", //id used to define `group` column
        header: "Neighbour Count",
        columns: [
          {
            accessorKey: "Source NC",
            header: "Source Neighbour Count",
            Header: <>Source</>,
            size: 50,
            filterVariant: "range-slider",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
            enableResizing: true,
          },
          {
            accessorKey: "Target NC",
            header: "Target Neighbour Count",
            Header: <>Target</>,
            size: 50,
            filterVariant: "range-slider",
            filterFn: "betweenInclusive",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
          },
          {
            accessorKey: "Total NC",
            header: "Total Neighbour Count",
            Header: <>Total</>,
            size: 50,
            filterVariant: "range-slider",
            muiFilterSliderProps: {
              size: "small",
              color: "primary",
            },
          },
        ],
      },
    ],
    []
  );

  function fixTextLength(text) {
    // Custom tooltip formatter function
    var content = "";
    var maxLength = 60; // Maximum characters per line
    for (var i = 0; i < text.length; i += maxLength) {
      content += text.substring(i, i + maxLength) + "<br/>";
    }
    return content;
  }

  console.log("pathfinderSettings", pathfinderSettings);

  useEffect(() => {
    console.log('PathFinder - Main useEffect triggered:', {
      hasPathFinderGraph: !!pathFinderGraph,
      nodesCount: pathFinderGraph?.nodes?.length || 0,
      edgesCount: pathFinderGraph?.edges?.length || 0,
      filterSettings: {
        filter1Enabled: pathfinderSettings.filter1Enabled,
        filter2Enabled: pathfinderSettings.filter2Enabled,
        filter3Enabled: pathfinderSettings.filter3Enabled,
        filter4Enabled: pathfinderSettings.filter4Enabled,
        cutoff: pathfinderSettings.cutoff,
        checkCorr: pathfinderSettings.checkCorr,
        BioGridData: pathfinderSettings.BioGridData
      }
    });
    
    if (
      pathFinderGraph &&
      pathFinderGraph.nodes &&
      pathFinderGraph.nodes.length > 0
    ) {
      const nodes = pathFinderGraph.nodes.map((node) => ({
        id: node.id,
        name: node.id,
        direction: node.direction,
        kd: node.kd,
      }));

      const edges = pathFinderGraph.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        id: edge.id,
        type: edge.type,
        value: edge.type === "Int" ? 1 : edge.value,
        lineStyle: {
          opacity: Math.min(
            ((1 - pathfinderSettings.minEdgeopacity) / 0.8) *
              Math.abs(edge.type === "Int" ? 1 : edge.value) +
              (pathfinderSettings.minEdgeopacity - 0.2) / 0.8,
            1
          ), //y = 0.813x + 0.187 //ax+b = y // ((1-pathfinderSettings.minEdgeopacity)/0.8) + ((pathfinderSettings.minEdgeopacity-0.2)/0.8)
          width: Math.max(
            2.222 * Math.abs(edge.type === "Int" ? 1 : edge.value) + 3.556,
            4
          ),
          color:
            edge.type === "Cor"
              ? "rgb(25, 25, 250)"
              : edge.value < -0.2
                ? "rgb(25, 206, 17)"
                : edge.value > 0.2
                  ? "rgb(255, 1, 1)"
                  : "rgb(123, 123, 123)",
          type:
            edge.type === "Cor"
              ? "dotted"
              : edge.type === "Int"
                ? "dashed"
                : "solid",
          curveness:
            edge.type === "Cor" ? 0.3 : edge.type === "Int" ? 0.5 : 0.4,
        },

        tooltip: {
          formatter:
            edge.type === "Cor"
              ? "Corr. R: " +
                edge.value +
                "<br />" +
                edge.id.replace("+cor+", " ~ ")
              : edge.type === "Int"
                ? "<b>Prot.-Prot. Int.:</b> " +
                  edge.id.replace("+int+", " ¤ ") +
                  "<br />" +
                  edge.info?.replaceAll(" # ", "<br />") +
                  "<br />" +
                  fixTextLength(edge.info2)
                : "Effect: " +
                  edge.value +
                  "<br />" +
                  edge.id.replace("+", " → "),
        },
        //value: edge.value,
      }));

      let edgesFiltered = [];

      for (let m = edges.length - 1; m > -1; m--) {
        const edge = edges[m];
        
        // Basic filtering
        if (edge.type === "Cor") {
          if (pathfinderSettings.checkCorr === false) continue;
          if (Math.abs(edge.value) < pathfinderSettings.corrCutOff) continue;
        } else if (edge.type === "Int" && pathfinderSettings.BioGridData === false) {
          continue;
        } else {
          if (Math.abs(edge.value) < pathfinderSettings.cutoff) continue;
        }

        // Apply noise filters if enabled
        if (pathfinderSettings.filter1Enabled || pathfinderSettings.filter2Enabled || pathfinderSettings.filter3Enabled || pathfinderSettings.filter4Enabled) {
          // Filter 1: Black Listed sgRNAs
          if (pathfinderSettings.filter1Enabled && !pathfinderSettings.filter1Directional) {
            if (edge.type !== "Cor" && edge.type !== "Int") {
              // Check source gene
              if (blacklistData?.blackListDown?.[edge.source] !== undefined &&
                  blacklistData.blackListDown[edge.source] > pathfinderSettings.filterBlackListed) {
                console.log('PathFinder - Filtered out edge (Filter 1, source down):', edge.source, '->', edge.target, 'value:', blacklistData.blackListDown[edge.source], 'threshold:', pathfinderSettings.filterBlackListed);
                continue;
              }
              if (blacklistData?.blackListUp?.[edge.source] !== undefined &&
                  blacklistData.blackListUp[edge.source] > pathfinderSettings.filterBlackListed) {
                console.log('PathFinder - Filtered out edge (Filter 1, source up):', edge.source, '->', edge.target, 'value:', blacklistData.blackListUp[edge.source], 'threshold:', pathfinderSettings.filterBlackListed);
                continue;
              }
              
              // Check target gene
              if (blacklistData?.blackListDown?.[edge.target] !== undefined &&
                  blacklistData.blackListDown[edge.target] > pathfinderSettings.filterBlackListed) {
                console.log('PathFinder - Filtered out edge (Filter 1, target down):', edge.source, '->', edge.target, 'value:', blacklistData.blackListDown[edge.target], 'threshold:', pathfinderSettings.filterBlackListed);
                continue;
              }
              if (blacklistData?.blackListUp?.[edge.target] !== undefined &&
                  blacklistData.blackListUp[edge.target] > pathfinderSettings.filterBlackListed) {
                console.log('PathFinder - Filtered out edge (Filter 1, target up):', edge.source, '->', edge.target, 'value:', blacklistData.blackListUp[edge.target], 'threshold:', pathfinderSettings.filterBlackListed);
                continue;
              }
            }
          }

          // Filter 2: Expression Black Listed
          if (pathfinderSettings.filter2Enabled && !pathfinderSettings.filter2Directional) {
            if (edge.type !== "Cor" && edge.type !== "Int") {
              // Check source gene
              if (blacklistData?.blackListExpDown?.[edge.source] !== undefined &&
                  blacklistData.blackListExpDown[edge.source] > pathfinderSettings.filterBlackListedExp) {
                continue;
              }
              if (blacklistData?.blackListExpUp?.[edge.source] !== undefined &&
                  blacklistData.blackListExpUp[edge.source] > pathfinderSettings.filterBlackListedExp) {
                continue;
              }
              
              // Check target gene
              if (blacklistData?.blackListExpDown?.[edge.target] !== undefined &&
                  blacklistData.blackListExpDown[edge.target] > pathfinderSettings.filterBlackListedExp) {
                continue;
              }
              if (blacklistData?.blackListExpUp?.[edge.target] !== undefined &&
                  blacklistData.blackListExpUp[edge.target] > pathfinderSettings.filterBlackListedExp) {
                continue;
              }
            }
          }

          // Filter 3: Perturbation Count
          if (pathfinderSettings.filter3Enabled) {
            if (blacklistData?.blackListPCount?.[edge.source] !== undefined &&
                blacklistData.blackListPCount[edge.source] > pathfinderSettings.filterCount) {
              continue;
            }
            if (blacklistData?.blackListPCount?.[edge.target] !== undefined &&
                blacklistData.blackListPCount[edge.target] > pathfinderSettings.filterCount) {
              continue;
            }
          }

          // Filter 4: Expression Count
          if (pathfinderSettings.filter4Enabled) {
            if (blacklistData?.blackListECount?.[edge.source] !== undefined &&
                blacklistData.blackListECount[edge.source] > pathfinderSettings.filterCountExp) {
              continue;
            }
            if (blacklistData?.blackListECount?.[edge.target] !== undefined &&
                blacklistData.blackListECount[edge.target] > pathfinderSettings.filterCountExp) {
              continue;
            }
          }
        }

        // If we reach here, the edge passed all filters
        edgesFiltered.push(edge);
        
        // Debug: Log first few edges that pass filters
        if (edgesFiltered.length <= 3) {
          console.log('PathFinder - Edge passed filters:', {
            source: edge.source,
            target: edge.target,
            type: edge.type,
            value: edge.value,
            blacklistValues: {
              sourceDown: blacklistData?.blackListDown?.[edge.source],
              sourceUp: blacklistData?.blackListUp?.[edge.source],
              targetDown: blacklistData?.blackListDown?.[edge.target],
              targetUp: blacklistData?.blackListUp?.[edge.target],
              sourceExpDown: blacklistData?.blackListExpDown?.[edge.source],
              sourceExpUp: blacklistData?.blackListExpUp?.[edge.source],
              targetExpDown: blacklistData?.blackListExpDown?.[edge.target],
              targetExpUp: blacklistData?.blackListExpUp?.[edge.target],
              sourcePCount: blacklistData?.blackListPCount?.[edge.source],
              targetPCount: blacklistData?.blackListPCount?.[edge.target],
              sourceECount: blacklistData?.blackListECount?.[edge.source],
              targetECount: blacklistData?.blackListECount?.[edge.target]
            }
          });
        }
      }

      console.log('PathFinder - Filtering results:', {
        totalEdges: edges.length,
        edgesAfterFiltering: edgesFiltered.length,
        cutoff: pathfinderSettings.cutoff,
        checkCorr: pathfinderSettings.checkCorr,
        BioGridData: pathfinderSettings.BioGridData,

        filter1Enabled: pathfinderSettings.filter1Enabled,
        filter2Enabled: pathfinderSettings.filter2Enabled,
        filter3Enabled: pathfinderSettings.filter3Enabled,
        filter4Enabled: pathfinderSettings.filter4Enabled
      });

      let nodesFiltered = nodes;

      // Filter nodes based on blacklist data if filters are enabled
      if (pathfinderSettings.filter1Enabled || pathfinderSettings.filter2Enabled || pathfinderSettings.filter3Enabled || pathfinderSettings.filter4Enabled) {
        console.log('PathFinder - Filtering nodes based on blacklist data');
        const originalNodeCount = nodesFiltered.length;
        
        nodesFiltered = nodesFiltered.filter((node) => {
          const nodeId = node.id;
          
          // Filter 1: Black Listed sgRNAs
          if (pathfinderSettings.filter1Enabled && blacklistData) {
            if (blacklistData?.blackListDown?.[nodeId] !== undefined &&
                blacklistData.blackListDown[nodeId] > pathfinderSettings.filterBlackListed) {
              if (!pathfinderSettings.filter1Directional) {
                console.log('PathFinder - Filtered out node (down):', nodeId);
                return false;
              }
            }
            if (blacklistData?.blackListUp?.[nodeId] !== undefined &&
                blacklistData.blackListUp[nodeId] > pathfinderSettings.filterBlackListed) {
              if (!pathfinderSettings.filter1Directional) {
                console.log('PathFinder - Filtered out node (up):', nodeId);
                return false;
              }
            }
          }

          // Filter 2: Expression Black Listed
          if (pathfinderSettings.filter2Enabled && blacklistData) {
            if (blacklistData?.blackListExpDown?.[nodeId] !== undefined &&
                blacklistData.blackListExpDown[nodeId] > pathfinderSettings.filterBlackListedExp) {
              if (!pathfinderSettings.filter2Directional) {
                console.log('PathFinder - Filtered out node (exp down):', nodeId);
                return false;
              }
            }
            if (blacklistData?.blackListExpUp?.[nodeId] !== undefined &&
                blacklistData.blackListExpUp[nodeId] > pathfinderSettings.filterBlackListedExp) {
              if (!pathfinderSettings.filter2Directional) {
                console.log('PathFinder - Filtered out node (exp up):', nodeId);
                return false;
              }
            }
          }

          // Filter 3: Perturbation Count
          if (pathfinderSettings.filter3Enabled && blacklistData) {
            if (blacklistData?.blackListPCount?.[nodeId] !== undefined &&
                blacklistData.blackListPCount[nodeId] > pathfinderSettings.filterCount) {
              console.log('PathFinder - Filtered out node (pcount):', nodeId);
              return false;
            }
          }

          // Filter 4: Expression Count
          if (pathfinderSettings.filter4Enabled && blacklistData) {
            if (blacklistData?.blackListECount?.[nodeId] !== undefined &&
                blacklistData.blackListECount[nodeId] > pathfinderSettings.filterCountExp) {
              console.log('PathFinder - Filtered out node (ecount):', nodeId);
              return false;
            }
          }

          return true;
        });
        
        console.log('PathFinder - Node filtering results:', {
          originalNodeCount,
          filteredNodeCount: nodesFiltered.length,
          removedNodeCount: originalNodeCount - nodesFiltered.length
        });
      }

      if (!pathfinderSettings.isolatednodes) {
        let uniqueNodeNamesWithEdges = new Set();
        edgesFiltered.forEach((edge) => {
          if (edge.source !== edge.target) {
            uniqueNodeNamesWithEdges.add(edge.source);
            uniqueNodeNamesWithEdges.add(edge.target);
          }
        });
        nodesFiltered = nodesFiltered.filter(function (node) {
          return uniqueNodeNamesWithEdges.has(node.id);
        });
      }

      // Create a map to keep track of node counts
      const nodeCounts = {};
      let maxNodeCount = 2;
      // Count number of each node in edges array
      edgesFiltered.forEach((edge) => {
        const { source, target } = edge;
        if (!nodeCounts[source]) {
          nodeCounts[source] = 1;
        } else {
          nodeCounts[source]++;
        }
        if (!nodeCounts[target]) {
          nodeCounts[target] = 1;
        } else {
          nodeCounts[target]++;
        }
        maxNodeCount = Math.max(
          nodeCounts[source],
          nodeCounts[target],
          maxNodeCount
        );
      });

      console.log("maxNodeCount", maxNodeCount);

      // Update node counts in nodes array
      nodesFiltered.forEach((node) => {
        const { id } = node;
        if (nodeCounts[id]) {
          node["symbolSize"] =
            ((pathfinderSettings.maxNodeSize - 8) / (maxNodeCount - 1)) *
              nodeCounts[id] +
            (8 * maxNodeCount - pathfinderSettings.maxNodeSize) /
              (maxNodeCount - 1);
          node["neighbours"] = nodeCounts[id];
          node["label"] = {
            show: nodeCounts[id] > pathfinderSettings?.showLabels,
            position: nodeCounts[id] > 6 ? "inside" : "right",
            color: nodeCounts[id] > 6 ? "black" : "black",
          };
          //node["opacity"] = Math.max(Math.min(nodeCounts[id]*4 +4,40),8);
          node["itemStyle"] = {
            color: nodeCounts[id] > 6 ? "red" : "orange",
            //opacity: node["kd"]? Math.min(0.4118*Math.abs(node["kd"]),1):0.5
            opacity: node["kd"]
              ? Math.min(
                  ((1 - pathfinderSettings.minNodeopacity) / 0.8) *
                    Math.abs(node["kd"]) +
                    (pathfinderSettings.minNodeopacity - 0.2) / 0.8,
                  1
                )
              : pathfinderSettings.minNodeopacity, //y = 0.813x + 0.187 //ax+b = y // ((1-pathfinderSettings.minEdgeopacity)/0.8) + ((pathfinderSettings.minEdgeopacity-0.2)/0.8)
          };
        }
      });

      nodesFiltered = nodesFiltered.filter(function (node) {
        return node["neighbours"] > pathfinderSettings.minNeighbourCount;
      });

      // Apply node limit to prevent crashes with large networks
      const MAX_NODES = pathfinderSettings.maxNodes || 1000;
      if (nodesFiltered.length > MAX_NODES) {
        console.warn(`PathFinder - Network too large (${nodesFiltered.length} nodes). Limiting to top ${MAX_NODES} nodes by neighbour count.`);
        
        // Sort nodes by neighbour count and take top MAX_NODES
        nodesFiltered.sort((a, b) => b.neighbours - a.neighbours);
        nodesFiltered = nodesFiltered.slice(0, MAX_NODES);
        
        // Create a set of kept node IDs for filtering edges
        const keptNodeIds = new Set(nodesFiltered.map(node => node.id));
        
        // Filter edges to only include connections between kept nodes
        edgesFiltered = edgesFiltered.filter(edge => 
          keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target)
        );
      }

      console.log('PathFinder - After filtering:', {
        nodesCount: nodesFiltered.length,
        edgesCount: edgesFiltered.length
      });

      //For Dagre Layout
      let nodesFinal = [];
      let edgesFinal = [];

      if (pathfinderSettings.layout === "none") {
        // Create a new directed graph
        var g = new dagre.graphlib.Graph();
        // Set an object for the graph label

        g.setGraph({
          //height:10,
          //width:500,
          nodesep: 100,
          ranksep:
            pathfinderSettings.dagreSeperation === 0
              ? 1
              : pathfinderSettings.dagreSeperation,
        });
        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function () {
          return {};
        });
        // Add nodes to the graph.
        for (let i in nodesFiltered) {
          var node = nodesFiltered[i];
          if (node !== undefined) g.setNode(node.id, node);
        }

        // Add edges
        for (let i in edgesFiltered) {
          var edge = edgesFiltered[i];
          //if(edge.type2 === "Corr") continue;
          g.setEdge(edge.source, edge.target, edge);
        }
        dagre.layout(g);

        for (let x in g._edgeLabels)
          if (g._edgeLabels[x]) edgesFinal.push(g._edgeLabels[x]);

        for (let x in g._nodes) if (g._nodes[x]) nodesFinal.push(g._nodes[x]);
      } else {
        nodesFinal = nodesFiltered;
        edgesFinal = edgesFiltered;
      }

      //Generate the table from filtered data
      let tableInfo = [];
      let idSet = new Set(nodesFinal.map((node) => node.id));

      for (let m = edgesFinal.length - 1; m > -1; m--) {
        if (
          !idSet.has(edgesFinal[m].source) ||
          !idSet.has(edgesFinal[m].target)
        )
          continue;

        tableInfo.push({
          "Regulation Type": edgesFinal[m].type,
          From: edgesFiltered[m].source,
          To: edgesFiltered[m].target,
          Score: edgesFiltered[m].value,
          "Source NC": nodeCounts[edgesFiltered[m].source],
          "Target NC": nodeCounts[edgesFiltered[m].target],
          "Total NC":
            nodeCounts[edgesFiltered[m].target] +
            nodeCounts[edgesFiltered[m].source],
        });
      }
      setkeyedData(tableInfo);

      tableInfo.sort((edge1, edge2) => edge2["Total NC"] - edge1["Total NC"]);

      console.log(nodesFinal, edgesFiltered);

      setOptions({
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
              geneSymbol: params.data.name,
              knockdown: params.data.kd,
              neighbourCount: params.data.neighbours
            })
          }),
        },
        //legend: [
        //  {
        // selectedMode: 'single',
        //    data: pathFinderGraph.categories.map(function (a) {
        //      return a.name;
        //    })
        //  }
        //],
        toolbox: {
          show: true,
          feature: {
            mark: { show: true },
            restore: { show: true },
            saveAsImage: { show: true },
            dataZoom: {},
          },
        },
        brush: {},

        series: [
          {
            type: "graph",
            autoCurveness: true,
            circular: {
              rotateLabel: true,
            },
            layout:
              pathfinderSettings.layout === "none" && nodesFinal.length > 30
                ? "circular"
                : pathfinderSettings.layout,
            data: nodesFinal,
            links: edgesFinal,
            edgeSymbol: ["circle", "arrow"],
            edgeSymbolSize: [4, 14],
            edgeLabel: {
              fontSize: 16,
            },

            label: {
              show: true,
              position: "right",
              formatter: function (params) {
                return params.data.name;
              },
              fontWeight: "bold",
              color: "black",
            },
            emphasis: {
              focus: "adjacency",
              blurScope: "global",
              lineStyle: {
                width: 6,
              },
            },

            itemStyle: {
              color: function (params) {
                if (params.data.direction === "down") {
                  return "#1e81b0";
                } else {
                  return "red";
                }
              },
              borderColor: "black",
              borderWidth: 2,
            },
            lineStyle: {
              width: 4,
            },
            // categories: sample.categories,
            roam: true,
            force: {
              repulsion: pathfinderSettings.repulsion,
              //layoutAnimation : false,
              friction: 0.05,
            },
          },
        ],
      });
    }
  }, [pathFinderGraph, pathfinderSettings, blacklistData]);

  // Debug logging for settings changes
  useEffect(() => {
    console.log('PathFinder - Settings changed:', {
      filter1Enabled: pathfinderSettings.filter1Enabled,
      filter2Enabled: pathfinderSettings.filter2Enabled,
      filter3Enabled: pathfinderSettings.filter3Enabled,
      filter4Enabled: pathfinderSettings.filter4Enabled,
      cutoff: pathfinderSettings.cutoff,
      checkCorr: pathfinderSettings.checkCorr,
      BioGridData: pathfinderSettings.BioGridData
    });
  }, [pathfinderSettings]);

  // Debug logging for blacklist data
  useEffect(() => {
    console.log('PathFinder - Blacklist data received:', {
      hasBlacklistData: !!blacklistData,
      blacklistDataKeys: blacklistData ? Object.keys(blacklistData) : [],
      blacklistDataStructure: blacklistData ? {
        blackListDown: blacklistData.blackListDown ? Object.keys(blacklistData.blackListDown).length : 0,
        blackListUp: blacklistData.blackListUp ? Object.keys(blacklistData.blackListUp).length : 0,
        blackListExpDown: blacklistData.blackListExpDown ? Object.keys(blacklistData.blackListExpDown).length : 0,
        blackListExpUp: blacklistData.blackListExpUp ? Object.keys(blacklistData.blackListExpUp).length : 0,
        blackListPCount: blacklistData.blackListPCount ? Object.keys(blacklistData.blackListPCount).length : 0,
        blackListECount: blacklistData.blackListECount ? Object.keys(blacklistData.blackListECount).length : 0
      } : null,
      sampleBlacklistEntries: blacklistData ? {
        blackListDown: blacklistData.blackListDown ? Object.entries(blacklistData.blackListDown).slice(0, 3) : [],
        blackListUp: blacklistData.blackListUp ? Object.entries(blacklistData.blackListUp).slice(0, 3) : []
      } : null
    });
  }, [blacklistData]);

  return (
    <>
      {/* Add module description header */}
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
      }
      , '& .MuiAccordionSummary-root.Mui-expanded': {
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
        <AccordionDetails sx={{ padding: '6px 14px 5px' }}>
          <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
            {moduleDescription.description}
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
            {moduleDescription.description2}
          </p>
          <div style={{ fontSize: '13px', color: '#424242' }}>
            <strong>Key Features:</strong>
            <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '2px' }}>{feature}</li>
              ))}
            </ul>
          </div>
        </AccordionDetails>
      </Accordion>

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
            label: "Link Table",
          },
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />

      {keyedData && selectedView === 1 && (
        <EnrichmentTable data={keyedData} columns={columns} />
      )}
      
      {/* Show warning if node limit was applied */}
      {pathFinderGraph?.nodes?.length > (pathfinderSettings.maxNodes || 1000) && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fff3e0', 
          borderLeft: '4px solid #ff9800',
          borderRadius: '4px',
          color: '#e65100',
          marginBottom: '8px'
        }}>
          ⚠️ Network too large ({pathFinderGraph.nodes.length} nodes). Showing top {pathfinderSettings.maxNodes || 1000} nodes by neighbour count to prevent performance issues.
        </div>
      )}
      
      {selectedView === 0 &&
        options.series &&
        options.series.length > 0 &&
        options.series[0].data?.length > 0 && (
          <>
            {(pathfinderSettings.layout === "none") &
            (options.series[0].data?.length > 30)
              ? "Dagre layout can not be applied due to the size of the network. Using circular layout instead."
              : ""}
            <div className={styles.mainView}>
              <ReactEChartsCore
                echarts={echarts}
                option={options}
                style={{ height: "120%", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </>
        )}

      {selectedView === 0 &&
        (!options.series ||
          options.series.length === 0 ||
          !options.series[0].data ||
          options.series[0].data.length === 0) && (
          <>
            <div className={styles.mainView}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "50vh", // This assumes the parent container takes up the full viewport height
                  margin: "0 auto",
                  lineHeight: "1.6",
                  fontSize: "1.5em",
                  fontWeight: "bold",
                  padding: "20px",
                  maxWidth: "500px",
                  borderRadius: "10px",
                  textAlign: "center", // Ensuring text is centered within the div
                }}
              >
                Unfortunately, no links were identified among submitted genes.
                You may try decreasing the Z-Score cutoff or increasing search
                depth.
              </div>
            </div>
          </>
        )}
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  pathFinderGraph: calcResults?.pathFinderGraph?.result ?? null,
  graphmapSettings: settings?.graphmap ?? {},
  pathfinderSettings: settings?.pathfinder ?? {},
  // Note: blacklistData is passed as a prop from the parent page component
});

const MainContainer = connect(mapStateToProps)(PathFinder);

export { MainContainer as PathFinder };
