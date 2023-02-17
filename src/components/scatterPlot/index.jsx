import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Spacer, Select, Row } from "@oliasoft-open-source/react-ui-library";
import DataTable from "react-data-table-component";
import { TableWithSortAndFilter } from "../enrichment/";
import "echarts-gl";
import * as echarts from "echarts/core";
import { registerTransform } from "echarts/core";
//import GraphChart from 'echarts/charts';
import { ScatterChart, EffectScatterChart, CustomChart } from "echarts/charts";
import { transform } from "echarts-stat";
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
import $ from "jquery";
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

const ScatterPlot = ({
  pcaGraph,
  graphmapSettings,
  scatterplotSettings,
  coreSettings,
}) => {
  {
    console.log("Check 10");
  }

  const [options, setOptions] = useState({});

  const data = [["PC1", "PC2", "PC3", "GeneSymbol", "Cluster", "ClusterProb"]];
  var pieces = [];
  const clusterData = [];

  if (pcaGraph) {
    if (pcaGraph["clusterCount"] > 0) {
      for (var i = 0; i < pcaGraph["GeneSymbols"].length; i++) {
        data.push([
          pcaGraph["PC1"][i],
          pcaGraph["PC2"][i],
          pcaGraph["PC3"][i],
          pcaGraph["GeneSymbols"][i],
          pcaGraph["clusterLabels"][i],
          pcaGraph["clusterProb"][i],
        ]);
      }
    } else {
      for (var i = 0; i < pcaGraph["GeneSymbols"].length; i++) {
        data.push([
          pcaGraph["PC1"][i],
          pcaGraph["PC2"][i],
          pcaGraph["PC3"][i],
          pcaGraph["GeneSymbols"][i],
          -1,
          1,
        ]);
      }
    }

    var COLOR_ALL = [
      "#9b9b9b",
      "#37A2DA",
      "#e06343",
      "#37a354",
      "#b55dba",
      "#b5bd48",
      "#8378EA",
      "#96BFFF",
    ];

    console.log(pcaGraph);

    if (pcaGraph["clusterCount"] > 0) {
      for (let i = -1; i < pcaGraph["clusterCount"]; i++) {
        if (i === -1) {
          pieces.push({
            value: i,
            label: "Unclustered",
            color: COLOR_ALL[0],
            symbolSize: 8,
            symbol: "circle",
          });
          continue;
        }

        pieces.push({
          value: i,
          label: "Cluster " + (i + 1),
          color: COLOR_ALL[i + 1],
          symbolSize: 10,
          symbol: "circle",
        });

        if ((pcaGraph["x" + i].length > 0) & (pcaGraph["y" + i].length > 0)) {
          var clusterCurveData = [];
          for (var j = 0; j < pcaGraph["x" + i].length; j++) {
            clusterCurveData.push([pcaGraph["x" + i][j], pcaGraph["y" + i][j]]);
          }
          clusterData.push([i]);
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
  {
    console.log("Check 11");
  }
  useEffect(() => {
    {
      console.log("Check 12");
    }

    function renderItem(params, api) {
      {
        console.log("Rendering clusters");
      }
      {
        console.log(params);
      }
      var curIndex = api.value(0);

      const points = [];
      for (var i = 0; i < pcaGraph["x" + curIndex].length; i++) {
        points.push(
          api.coord([pcaGraph["x" + curIndex][i], pcaGraph["y" + curIndex][i]])
        );
      }

      var color = COLOR_ALL[curIndex + 1];

      return {
        type: "polygon",
        shape: {
          points: echarts.graphic.clipPointsByRect(points, {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width * 1.1,
            height: params.coordSys.height * 1.1,
          }),
        },
        style: api.style({
          fill: color,
          stroke: echarts.color.lift(color),
        }),
      };
    }

    if (coreSettings.graphType === "2D") {
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
          extraCssText: "width:auto; white-space:pre-wrap;",
          confine: true,
          backgroundColor: "#000000",
          textStyle: {
            fontSize: 13,
            color: "#FFFFFF",
            width: 100,
            overflow: "break",
          },
          formatter: function (params, ticket, callback) {
            var res = localStorage.getItem(params.data[3]);
            if (res !== null) {
              return localStorage.getItem(params.data[3]);
            }

            $.get(
              "https://amp.pharm.mssm.edu/Harmonizome/api/1.0/gene/" +
                params.data[3],
              function (content) {
                res =
                  '<span style="color: #e28743";> <b>' +
                  params.data[3] +
                  ": </b></span>" +
                  content.description;
                localStorage.setItem(params.data[3], res);
                callback(ticket, res);
              }
            );
            return "Loading";
          },
        },
        visualMap: {
          type: "piecewise",
          top: "bottom",
          left: "center",
          dimension: 4,
          pieces: pieces,
          orient: "horizontal",
        },
        grid: { left: 120 },
        xAxis: {},
        yAxis: {},
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
            type: "scatter",
            symbolSize: 12,
            itemGroupId: 4,
            datasetIndex: 0,
            emphasis: {
              focus: "self",
            },
            label: {
              show: false,
              position: "inside",
              formatter: function (params) {
                return params.data[3];
              },
              fontSize: 10,
              // fontWeight: 'bold',
              color: "black",
            },
          },
          {
            type: "custom",
            renderItem: renderItem,
            itemStyle: {
              opacity: 0.5,
            },
            animation: false,
            silent: true,
            datasetIndex: 1,
            z: -10,
            emphasis: {
              focus: "series",
            },
          },
        ],
      });
    } else {
      //3D chart
      console.log("3D plit");
      console.log(data);
      setOptions({
        grid3D: {
          viewControl: {
            autoRotate: true,
            // projection: 'orthographic'
          },
        },
        xAxis3D: { name: "Component 1" },
        yAxis3D: { name: "Component 2" },
        zAxis3D: { name: "Component 3" },
        visualMap: {
          type: "piecewise",
          top: "bottom",
          left: "center",
          dimension: 4,
          pieces: pieces,
          orient: "horizontal",
        },
        label: {
          formatter: "{GeneSymbol}: {c}",
        },
        tooltip: {
          extraCssText: "width:auto; white-space:pre-wrap;",
          confine: true,
          backgroundColor: "#000000",
          textStyle: {
            fontSize: 13,
            color: "#FFFFFF",
            width: 100,
            overflow: "break",
          },
          formatter: function (params, ticket, callback) {
            var res = localStorage.getItem(params.data[3]);
            if (res !== null) {
              return localStorage.getItem(params.data[3]);
            }

            $.get(
              "https://amp.pharm.mssm.edu/Harmonizome/api/1.0/gene/" +
                params.data[3],
              function (content) {
                res =
                  '<span style="color: #e28743";> <b>' +
                  params.data[3] +
                  ": </b></span>" +
                  content.description;
                localStorage.setItem(params.data[3], res);
                callback(ticket, res);
              }
            );
            return "Loading";
          },
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
        series: [
          {
            symbol: "circle",
            type: "scatter3D",
            symbolSize: 10,
            encode: {
              x: "PC1",
              y: "PC2",
              z: "PC3",
              tooltip: [0, 1, 2, 3, 4],
            },
            label: {
              show: true,
              formatter: function (params) {
                return params.data[3];
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
  }, [coreSettings, pcaGraph, graphmapSettings, scatterplotSettings]);

  return (
    /*<EchartsReact
        option={options}
        style={{ height: '100%', width: '100%' }}
    />*/

    <>
      <div style={{ width: "100%", height: "100%" }}>
        <Row spacing={0} width="100%" height="70%">
          <ReactEChartsCore
            echarts={echarts}
            option={options}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
          />
        </Row>
      </div>
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  pcaGraph: calcResults?.pcaGraph ?? null,
  pathFinderGraph: calcResults?.pathFinderGraph ?? null,
  graphmapSettings: settings?.graphmap ?? {},
  pathfinderSettings: settings?.pathfinder ?? {},
  coreSettings: settings?.core ?? {},
});

const MainContainer = connect(mapStateToProps)(ScatterPlot);

export { MainContainer as ScatterPlot };
