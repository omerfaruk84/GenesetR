import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Table,
  Spacer,
  ButtonGroup,
  Tabs,
  Field,
  Label,
  Card,
  Text,
  Select,
} from "@oliasoft-open-source/react-ui-library";
import { FaChartBar, FaTable } from "react-icons/fa";
import styles from "../../pages/expressionanalyzer/expression-analyzer.module.scss";
import { connect } from "react-redux";
import { useEffect } from "react";
import * as echarts from "echarts/core";
//import GraphChart from 'echarts/charts';
import { ScatterChart } from "echarts/charts";
import EnrichmentTable from "../enrichment-table-new";
import { GeneSetEnrichmentTable } from "../enrichment";
import { getBlackList } from "../../store/api";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomSliderComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
} from "echarts/components";
import {
  CanvasRenderer,
  // SVGRenderer,
} from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { download } from "export-to-csv";
import { ModulePathNames } from "../../store/results/enums";
import { set } from "idb-keyval";
import { LoadingPage } from "../loading-page";
import { useFetcher } from "react-router-dom";
import { runCalculation } from "../../store/results";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "../side-bar/settings/enums";
echarts.use([
  TitleComponent,
  DataZoomSliderComponent,
  TooltipComponent,
  GridComponent,
  ScatterChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

const ExpressionAnalyzer = ({
  runCalculation,
  coreSettings,
  expressionanalyzerSettings,
  data,
  calcResults,
  coreSettingsChanged,
}) => {
  const [selectedView, setSelectedView] = useState(0);
  const [options, setOptions] = useState({});
  const [pointData, setPointData] = useState([]);
  const [probes, setProbes] = useState([]);
  const [selectedProbe, setSelectedProbe] = useState(0);
  const [pointDistribution, setPointDistribution] = useState([]);
  const [keyedData, setkeyedData] = useState([{}]);
  const [selectedTab, setSelectedTab] = useState({
    label: "Perturbation Effects",
    value: 0,
  });
  const [selectedInnerTab, setSelectedInnerTab] = useState({
    label: "Expression",
    value: 0,
  });
  const [genelists, setGeneLists] = useState([]);
  const [blackListDown, setblackListDown] = useState({});
  const [blackListUp, setblackListUp] = useState({});
  const [downstream, setdownStream] = useState({});
  const [upstream, setupStream] = useState({});
  const [pertCorr, setpertCorr] = useState({});
  const [expCorr, setexpCorr] = useState({});
  const [isCalcRunning, setisRunning] = useState(false);
  const [tabOptions, settabOptions] = useState([
    {
      label: "Perturbation Effects",
      value: 0,
      disabled: false,
    },
    {
      label: "Perturbed by",
      value: 1,
      disabled: false,
    },
  ]);
  const [innerTabOptions, setinnerTabOptions] = useState([
    {
      label: "Expression",
      value: 0,
      disabled: false,
    },
    {
      label: "Correlation",
      value: 1,
      disabled: false,
    },
  ]);
  const location = useLocation();
  const { pathname } = location;

  //console.log(coreSettings.cellLine);

  useEffect(() => {
    runCalculation(pathname);
    coreSettingsChanged({
      settingName: CoreSettingsTypes.SHOW_HELP,
      newValue: false,
    });
  }, [coreSettings.cellLine[0]]);

  useEffect(() => {
    setisRunning(
      calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running
    );
  }, [calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running]);

  useEffect(() => {
    if (!isCalcRunning && data && data.geneRegulationResults) {
      //console.log("Updating");
      if (data.geneRegulationResults.downstream.length > 0) {
        const newTabs2 = tabOptions;
        newTabs2[0].disabled = false;
        settabOptions(newTabs2);
        setSelectedTab(selectedTab);
        setdownStream(JSON.parse(data.geneRegulationResults.downstream));
      } else {
        setdownStream({});
        const newTabs = tabOptions;
        newTabs[0].disabled = true;
        settabOptions(newTabs);
        setSelectedTab(tabOptions[1]);
      }

      if (data.geneRegulationResults.upstream.length > 0)
        setupStream(JSON.parse(data.geneRegulationResults.upstream));
      else setupStream({});

      if (data.geneRegulationResults.pertCorr.length > 0)
        setpertCorr(JSON.parse(data.geneRegulationResults.pertCorr));
      else setpertCorr({});

      if (data.geneRegulationResults.expCorr.length > 0)
        setexpCorr(JSON.parse(data.geneRegulationResults.expCorr));
      else setexpCorr({});
    }
  }, [data.geneRegulationResults?.upstream, isCalcRunning]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "Gene", //normal accessorKey
        header: "Gene",
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
        accessorKey: "Effect",
        header: "Effect",
        size: 50,
        maxSize: 50,
        filterVariant: "select",
        muiFilterTextFieldProps: {
          placeholder: "Select",
          size: "small",
        },
      },

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
      {
        accessorKey: "Z-Score",
        header: "Z-Score",
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

  const corrcolumns = useMemo(
    () => [
      {
        accessorKey: "Gene", //normal accessorKey
        header: "Gene",
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
        accessorKey: "Effect",
        header: "Effect",
        size: 50,
        maxSize: 50,
        filterVariant: "select",
        muiFilterTextFieldProps: {
          placeholder: "Select",
          size: "small",
        },
      },

      {
        accessorKey: "Score",
        header: "Corr. R",
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

  function roundToThree(num) {
    return +(Math.round(num + "e+3") + "e-3");
  }

  //Function to find nearest index

  function trimmedMean(arr, trimPercentage) {
    // Sort the array in ascending order
    arr = arr.slice().sort(function (a, b) {
      return a - b;
    });

    // Determine the number of elements to trim
    var trimCount = Math.floor(arr.length * (trimPercentage / 100));

    // Remove the specified number of elements from both ends
    var trimmedArr = arr.slice(trimCount, arr.length - trimCount);

    // Calculate the mean of the remaining elements
    const mean = trimmedArr.reduce((a, b) => a + b) / trimmedArr.length;
    const std = Math.sqrt(
      trimmedArr.reduce((a, b) => a + (b - mean) ** 2, 0) /
        (trimmedArr.length - 1)
    );

    return { mean: mean, std: std };
  }

  useEffect(() => {
    getBlackList().then((result) => {
      const genesUp = {};
      const genesDown = {};

      for (const gene in result.blacklist.ZS) {
        if (result.blacklist.ZS[gene] > 0) {
          genesUp[gene] = result.blacklist.ZS[gene];
        } else {
          genesDown[gene] = Math.abs(result.blacklist.ZS[gene]);
        }
      }
      ////console.log("setblackListDown", genesDown);
      ////console.log("setblackListUp", genesUp);
      setblackListDown(genesDown);
      setblackListUp(genesUp);
    });
  }, []);

  function calculateZscore(data) {
    var results = trimmedMean(data, 0.2);
    if (results.mean === undefined) results.mean = 0;
    if (results.std === undefined) results.std = 1;
    // Calculate the Z-scores for each data point
    return data.map((value) => (value - results.mean) / results.std);
  }

  function calculateDataDistribution(data, binSize = 0.05) {
    // Determine the range of the data
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let num of data) {
      if (num < min) {
        min = num;
      }
      if (num > max) {
        max = num;
      }
    }

    // Initialize bins
    let bins = [];
    for (let i = min; i <= max; i += binSize) {
      bins.push({ binStart: i, binEnd: i + binSize, count: 0 });
    }

    // Iterate through data and increment the count of the corresponding bin
    for (let value of data) {
      let binIndex = Math.floor((value - min) / binSize) - 1;
      if (binIndex < 0) binIndex = 0;
      if (binIndex > bins.length - 1) binIndex = bins.length - 1;

      bins[binIndex].count++;
    }

    //Calculate rolling average for distribution graph
    const pointDistribution = [];
    for (let i = 2; i <= bins.length - 3; i += 1) {
      pointDistribution.push([
        bins[i].binEnd,
        (bins[i - 2].count +
          bins[i - 1].count +
          bins[i].count +
          bins[i + 1].count +
          bins[i + 2].count) /
          5,
      ]);
    }

    return { min, binSize, bins, pointDistribution, data };
  }

  useEffect(() => {
    if (!data) return;
    let highlightList = new Set(
      expressionanalyzerSettings?.genesTolabel
        .replaceAll(/[,\s;]+/g, "\n")
        .trimStart("\n")
        .split("\n")
    );
    highlightList = new Set([...highlightList]);
    //console.log("highlightList", highlightList);

    let selectedData;
    var zScoreConv = false;

    if (selectedTab.value === 0) {
      switch (selectedInnerTab.value) {
        case 0:
          selectedData = downstream;
          zScoreConv = true;
          break;
        case 1:
          selectedData = pertCorr;
          break;
        default:
          break;
      }
    } else if (selectedTab.value === 1) {
      switch (selectedInnerTab.value) {
        case 0:
          selectedData = upstream;
          zScoreConv = true;
          break;
        case 1:
          selectedData = expCorr;
          break;
        default:
          break;
      }
    }
    //console.log("selectedData", selectedData, upstream, expCorr);

    if (Object.keys(selectedData).length > 0) {
      setProbes(Object.keys(selectedData));

      if (Object.keys(selectedData).length === 1 && selectedProbe > 0)
        setSelectedProbe(0);
    }

    console.log(selectedData, selectedProbe);

    if (
      selectedData &&
      Object.keys(selectedData).length > 0 &&
      Object.keys(selectedData).length > selectedProbe &&
      selectedData[Object.keys(selectedData)[selectedProbe]]
    ) {
      //const chart = echarts.init(chartRef.current);
      let xValues = Object.values(
        selectedData[Object.keys(selectedData)[selectedProbe]]
      );
      const labels = Object.keys(
        selectedData[Object.keys(selectedData)[selectedProbe]]
      );

      let tableInfo = [];
      //setkeyedData(tableInfo);
      const pointData2 = [];

      let zScores = xValues;
      let binSize = 0.01;
      if (zScoreConv) {
        binSize = 0.05;
        zScores = calculateZscore(xValues);
      }

      var result = calculateDataDistribution(zScores, binSize);

      //findNearestIndex(distX,distY, xValues[i])
      for (let i = 0; i < xValues.length; i++) {
        //if (!zScoreConv && xValues[i] === 1) continue;
        if (
          expressionanalyzerSettings.filter &&
          xValues[i] < 0 &&
          blackListDown[labels[i]] !== undefined &&
          blackListDown[labels[i]] >
            expressionanalyzerSettings.filterBlackListed
        )
          continue;
        else if (
          expressionanalyzerSettings.filter &&
          xValues[i] > 0 &&
          blackListUp[labels[i]] !== undefined &&
          blackListUp[labels[i]] > expressionanalyzerSettings.filterBlackListed
        )
          continue;

        //For sgRNAs that are not significant we dont need to show all.
        if (
          ((zScoreConv && zScores[i] < 1.5 && zScores[i] > -1.5) ||
            (!zScoreConv && zScores[i] < 0.1 && zScores[i] > -0.1)) &&
          !highlightList.has(labels[i])
        ) {
          let randomNum = Math.floor(Math.random() * 10) + 1; //Generate random num 1:10
          if (randomNum < 7) continue;
        }

        let binLoc =
          result.bins[Math.floor((zScores[i] - result.min) / result.binSize)]
            .count;
        let histY = Math.random() * 2 * binLoc - binLoc;
        pointData2.push([
          zScores[i],
          histY,
          labels[i],
          xValues[i],
          highlightList.has(labels[i]),
        ]);

        if (zScoreConv) {
          tableInfo.push({
            Gene: labels[i],
            Effect:
              zScores[i] > 2
                ? selectedTab.value === 0
                  ? "UPREGULATED"
                  : "UPREGULATES"
                : zScores[i] < -2
                  ? selectedTab.value === 0
                    ? "DOWN REGULATED"
                    : "DOWN REGULATES"
                  : "NO CHANGE",
            Score: xValues[i],
            "Z-Score": roundToThree(zScores[i]),
          });
        } else {
          tableInfo.push({
            Gene: labels[i],
            Effect:
              xValues[i] > 0.8
                ? "STRONG POSITIVE CORR"
                : xValues[i] > 0.5
                  ? "POSITIVE CORR"
                  : xValues[i] > 0.1
                    ? "WEAK POSITIVE CORR"
                    : xValues[i] < -0.8
                      ? "STRONG NEGATIVE CORR"
                      : xValues[i] < -0.5
                        ? "NEGATIVE CORR"
                        : xValues[i] < -0.1
                          ? "WEAK NEGATIVE CORR"
                          : "NO CORR",
            Score: xValues[i],
          });
        }
      }

      if (zScoreConv) {
        tableInfo.sort((geneA, geneB) => geneB["Z-Score"] - geneA["Z-Score"]);
      } else {
        tableInfo.sort((geneA, geneB) => geneB["Score"] - geneA["Score"]);
      }

      const upreg = tableInfo
        .filter((gene) => gene.Effect.startsWith("UP"))
        .map((gene) => gene.Gene);
      const dowreg = tableInfo
        .filter((gene) => gene.Effect.startsWith("DOWN"))
        .map((gene) => gene.Gene);
      const top20 = tableInfo.slice(0, 20).map((gene) => gene.Gene);
      const top50 = tableInfo.slice(0, 50).map((gene) => gene.Gene);
      const top100 = tableInfo.slice(0, 100).map((gene) => gene.Gene);
      const bottom20 = tableInfo
        .slice(Math.max(tableInfo.length - 20, 0))
        .map((gene) => gene.Gene);
      const bottom50 = tableInfo
        .slice(Math.max(tableInfo.length - 50, 0))
        .map((gene) => gene.Gene);
      const bottom100 = tableInfo
        .slice(Math.max(tableInfo.length - 100, 0))
        .map((gene) => gene.Gene);
      const temp = {};

      if (selectedInnerTab.value === 0) {
        temp["Upregulated"] = upreg.join();
        temp["Downregulated"] = dowreg.join();
        temp["Top 20 Upregulated"] = top20.join();
        temp["Top 50 Upregulated"] = top50.join();
        temp["Top 100 Upregulated"] = top100.join();
        temp["Top 20 Downregulated"] = bottom20.join();
        temp["Top 50 Downregulated"] = bottom50.join();
        temp["Top 100 Downregulated"] = bottom100.join();
      } else {
        temp["STRONG POSITIVE CORR"] = tableInfo
          .filter((gene) => gene.Score > 0.8)
          .map((gene) => gene.Gene)
          .join();

        temp["POSITIVE CORR"] = tableInfo
          .filter((gene) => gene.Score > 0.5 && gene.Score <= 0.8)
          .map((gene) => gene.Gene)
          .join();

        temp["WEAK POSITIVE CORR"] = tableInfo
          .filter((gene) => gene.Score > 0.1 && gene.Score <= 0.5)
          .map((gene) => gene.Gene)
          .join();
        temp["STRONG NEGATIVE CORR"] = tableInfo
          .filter((gene) => gene.Score < -0.8)
          .map((gene) => gene.Gene)
          .join();

        temp["NEGATIVE CORR"] = tableInfo
          .filter((gene) => gene.Score < -0.5 && gene.Score >= -0.8)
          .map((gene) => gene.Gene)
          .join();

        temp["WEAK NEGATIVE CORR"] = tableInfo
          .filter((gene) => gene.Score < -0.1 && gene.Score >= -0.5)
          .map((gene) => gene.Gene)
          .join();
      }

      //console.log("Here we go #2");

      setGeneLists(temp);
      setPointDistribution(result.pointDistribution);

      setkeyedData(tableInfo);

      pointData2.sort((a, b) => b[0] - a[0]);

      setPointData(pointData2);
    }
  }, [
    data,
    coreSettings.targetGeneList,
    expressionanalyzerSettings,
    selectedTab.value,
    selectedInnerTab.value,
    data.geneRegulationResults,
    downstream,
    selectedProbe,
  ]);

  //Set graph options
  useEffect(() => {
    //console.log("Here we go #3");
    if (!data.geneRegulationResults) return;
    //console.log("Here we go #4");
    setOptions({
      tooltip: {
        formatter: function (params) {
          return params.data[2] + "<br> Score: " + params.data[0]?.toFixed(2);
        },
      },
      xAxis: [
        {
          type: "value",
        },
      ],
      yAxis: {},
      dataZoom: [
        {
          type: "slider",
          show: true,
          realtime: true,
          xAxisIndex: [0],
        },
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: "none",
          },
          restore: {},
          saveAsImage: {},
        },
      },

      series: [
        {
          name: "Series 2",
          type: "line",
          roam: true,
          symbol: "none",
          lineStyle: {
            width: 0,
          },
          xAxisIndex: 0, // use the second x-axis for this series
          data: pointDistribution.map(function (x) {
            return [x[0], x[1]];
          }),
        },
        {
          roam: true,
          data: pointData,
          itemStyle: {
            color: function (params) {
              if (params.data[2].startsWith("non-targeting"))
                return "rgba(216, 245, 39, 0.5)"; //yellow
              else if (params.data[4] === true) {
                return "rgba(39, 96, 245, 0.7)";
              } //blue highlight
              else if (
                (selectedInnerTab.value === 0 && params.data[0] > 2) ||
                (selectedInnerTab.value === 1 && params.data[0] > 0.5)
              ) {
                return "rgba(39, 245, 55, 0.7)"; //green
              } else if (
                (selectedInnerTab.value === 0 && params.data[0] < -2) ||
                (selectedInnerTab.value === 1 && params.data[0] < -0.5)
              ) {
                return "rgba(245, 55, 39, 0.7)"; //red
              } else if (
                selectedInnerTab.value === 1 &&
                params.data[0] > 0.15
              ) {
                return "rgba(39, 245, 55, 0.4)"; //green
              } else if (
                selectedInnerTab.value === 1 &&
                params.data[0] < -0.5
              ) {
                return "rgba(245, 55, 39, 0.4)"; //red
              } else {
                //if( params.data[3]> -2 &&params.data[3]<2 )
                return (
                  "rgba(200, 200, 200," +
                  String((Math.abs(params.data[0]) + 0.1) * 0.15 + 0.185) +
                  ")"
                );
              }
            },
          },
          label: {
            show: true,
            color: "black",
            position: "top",
            fontSize: 14,
            formatter: function (params) {
              if (params.data[4] === true) {
                return params.data[2];
              } else if (params.data[0] > 2 || params.data[0] < -2) {
                return params.data[2];
              } else {
                return "";
              }
            },
          },
          symbolSize: function (params) {
            if (params[2].startsWith("non-targeting")) return 6;
            else if (params[0] > 2 || params[0] < -2) return 10;
            else return Math.round(Math.abs(params[0]) * 2.5 + 3);
          },
          type: "scatter",
        },
      ],
    });
  }, [pointData, data.geneRegulationResults, pointDistribution]);

  return (
    <>
      {isCalcRunning ? (
        <LoadingPage />
      ) : (
        <>
          {probes.length > 1 && (
            <>
              <Spacer height={5} />
              <Field
                label="Multiple probes available:"
                labelLeft
                labelWidth={180}
                helpText="There are multiple perturbations available for this gene. Select one."
              >
                <Select
                  width={200}
                  onChange={({ target: { value } }) => {
                    const selectedIndex = probes.findIndex((probe) => {
                      return probe === value;
                    });
                    setSelectedProbe(selectedIndex);
                  }}
                  options={probes}
                  value={probes[selectedProbe]}
                />
              </Field>
            </>
          )}
          <Tabs
            name="tabs"
            value={selectedTab}
            options={tabOptions}
            onChange={(evt) => {
              const { value, label } = evt.target;
              setSelectedTab({ value, label });
            }}
          />
          <Card bordered>
            <Tabs
              name="innertabs"
              value={selectedInnerTab}
              options={innerTabOptions}
              onChange={(evt) => {
                const { value, label } = evt.target;
                setSelectedInnerTab({ value, label });
              }}
            />
            {selectedInnerTab.value === 1 && selectedTab.value === 0 && (
              <>
                <Text success>
                  Which perturbations show similar effects to
                  {coreSettings.cellLine[0] === "TFAtlas"
                    ? " overexpression "
                    : " perturbation "}
                  of
                  {" " + expressionanalyzerSettings.selectedGene}?
                </Text>
                <Spacer height={5} />
              </>
            )}
            {selectedInnerTab.value === 0 && selectedTab.value === 0 && (
              <>
                <Text success>
                  Which genes are up or down regulated upon{" "}
                  {coreSettings.cellLine[0] === "TFAtlas"
                    ? " overexpression "
                    : " perturbation "}{" "}
                  of
                  {" " + expressionanalyzerSettings.selectedGene}?
                </Text>
                <Spacer height={5} />
              </>
            )}
            {selectedInnerTab.value === 0 && selectedTab.value === 1 && (
              <>
                <Text success>
                  {coreSettings.cellLine[0] === "TFAtlas"
                    ? " Overexpression "
                    : " Perturbation "}{" "}
                  of which{" "}
                  {coreSettings.cellLine[0] === "TFAtlas"
                    ? " transcription factors "
                    : " genes "}{" "}
                  up or down regulate
                  {" " +
                    expressionanalyzerSettings.selectedGene +
                    " expression"}
                  ?
                </Text>
                <Spacer height={5} />
              </>
            )}
            {selectedInnerTab.value === 1 && selectedTab.value === 1 && (
              <>
                <Text success>
                  Expression of which genes show similar pattern to
                  {" " +
                    expressionanalyzerSettings.selectedGene +
                    " expression upon perturbation of genome?"}
                  ?
                </Text>
                <Spacer height={5} />
              </>
            )}
            <ButtonGroup
              items={[
                {
                  icon: <FaChartBar />,
                  key: 0,
                  label: "Graph",
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
            {keyedData && selectedView === 1 && (
              <>
                <EnrichmentTable
                  data={keyedData}
                  columns={selectedInnerTab.value === 0 ? columns : corrcolumns}
                />
              </>
            )}
            {selectedView === 0 && (
              <>
                <div className={styles.mainView}>
                  <ReactEChartsCore
                    echarts={echarts}
                    option={options}
                    style={{ height: "100%", width: "100%" }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </div>
              </>
            )}
            <Spacer height={5} />

            {genelists && Object.keys(genelists).length > 0 && (
              <>
                <GeneSetEnrichmentTable genesets={genelists} />
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  calcResults,
  coreSettings: settings?.core ?? {},
  expressionanalyzerSettings: settings?.expressionanalyzer ?? {},
});
const mapDispatchToProps = {
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpressionAnalyzer);

export { MainContainer as ExpressionAnalyzer };
