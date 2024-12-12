import React, { useEffect, useRef, useState, useMemo } from "react";
import { connect } from "react-redux";
import * as echarts from "echarts/core";
import { ButtonGroup } from "@oliasoft-open-source/react-ui-library";
//import GraphChart from 'echarts/charts';
import { GraphChart } from "echarts/charts";
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../../components/enrichment-table-new";
import {
  GridComponent,
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
// import text from './sample.json';
import dagre from "dagre";
import styles from "./pathfinder.module.scss";

const helps = {
  "Regulation Type":
    "Cor: Correlation; Exp: Expression; Int: Protein-Protein Interaction",
  Score: "r Value for correlation\n Z Score for expression",
  "Source NC": "Source Neighbour Count",
  "Target NC": "Target Neighbour Count",
  "Total NC": "Total Neighbour Count",
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

const PathFinder = ({ pathFinderGraph, pathfinderSettings }) => {
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

      for (let edge in edges) {
        if (edges[edge].type === "Cor") {
          if (pathfinderSettings.checkCorr === false) continue;

          if (Math.abs(edges[edge].value) < pathfinderSettings.corrCutOff)
            continue;
        } else if (
          edges[edge].type === "Int" &&
          pathfinderSettings.BioGridData === false
        ) {
          continue;
        } else {
          if (Math.abs(edges[edge].value) < pathfinderSettings.cutoff) continue;
        }
        edgesFiltered.push(edges[edge]);
      }

      let nodesFiltered = nodes;

      if (!pathfinderSettings.isolatednodes) {
        let uniqueNodeNamesWithEdges = new Set();
        edgesFiltered.forEach((edge) => {
          if (edge.source !== edge.target) {
            uniqueNodeNamesWithEdges.add(edge.source);
            uniqueNodeNamesWithEdges.add(edge.target);
          }
        });
        nodesFiltered = nodes.filter(function (node) {
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

      console.log(edgesFiltered);

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
          formatter: function (params) {
            let kd = "";
            if (params.data.kd)
              kd =
                "Knockdown: " +
                params.data.kd +
                (params.data.neighbours
                  ? "<br>Neighbour Count: " + params.data.neighbours
                  : "");
            return params.data.name + "<br>" + kd;
          },
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
  }, [pathFinderGraph, pathfinderSettings]);

  return (
    <>
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
});

const MainContainer = connect(mapStateToProps)(PathFinder);

export { MainContainer as PathFinder };
