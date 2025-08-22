import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { safeJsonParse } from "../../utils/jsonUtils";
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
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import styles from "../../pages/expressionanalyzer/expression-analyzer.module.scss";
import { connect } from "react-redux";
import { useEffect } from "react";
import * as echarts from "echarts/core";
//import GraphChart from 'echarts/charts';
import { ScatterChart } from "echarts/charts";
import EnrichmentTable from "../enrichment-table-new";
import { GeneSetEnrichmentTable } from "../enrichment";

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

// Add module description for Expression Analyzer
const moduleDescription = {
  title: "Gene Expression Analyzer",
  description: "This module enables comprehensive analysis of a selected gene to explore its regulatory dynamics. It identifies upstream regulators, downstream targets, and genes with similar expression responses across perturbation datasets.",
  capabilities: [
    "Identify genes up/down-regulated upon targeting your GOI (downstream targets)",
    "Find perturbations that regulate expression of your GOI (upstream regulators)", 
    "Discover perturbations that correlate with targeting of your GOI",
    "Identify genes with similar expression responses as your GOI"
  ],
  tabs: {
    perturbationEffects: "Shows genes affected by perturbation of your gene of interest - these are the downstream targets",
    perturbedBy: "Shows perturbations that affect expression of your gene of interest - these are upstream regulators",
  }
};

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
  blacklistData,
  blacklistLoading,
}) => {
  console.log('ExpressionAnalyzer - Component props:', {
    hasData: !!data,
    dataType: typeof data,
    dataKeys: data ? Object.keys(data) : [],
    dataPreview: data ? JSON.stringify(data).substring(0, 200) + '...' : null
  });
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

  useEffect(() => {
    runCalculation(pathname);
    coreSettingsChanged({
      settingName: CoreSettingsTypes.SHOW_HELP,
      newValue: false,
    });
  }, [coreSettings.cellLine.id, runCalculation, pathname, coreSettingsChanged]);

  useEffect(() => {
    setisRunning(
      calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running
    );
  }, [calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running]);

  useEffect(() => {
    console.log('ExpressionAnalyzer - Data processing useEffect triggered:', {
      hasData: !!data,
      isCalcRunning,
      dataKeys: data ? Object.keys(data) : [],
      hasUpstream: !!(data?.upstream),
      hasDownstream: !!(data?.downstream),
      hasPertCorr: !!(data?.pertCorr),
      hasExpCorr: !!(data?.expCorr)
    });
    
    if (!isCalcRunning && data) {
      // Process downstream data
      if (data.downstream && data.downstream.length > 0) {
        console.log('ExpressionAnalyzer - Processing downstream data:', {
          downstreamType: typeof data.downstream,
          downstreamLength: data.downstream.length
        });
        const newTabs2 = tabOptions;
        newTabs2[0].disabled = false;
        settabOptions(newTabs2);
        setSelectedTab(selectedTab);
        setdownStream(safeJsonParse(data.downstream, { defaultValue: {} }));
      } else {
        setdownStream({});
        const newTabs = tabOptions;
        newTabs[0].disabled = true;
        settabOptions(newTabs);
        setSelectedTab(tabOptions[1]);
      }

      // Process upstream data
      if (data.upstream && data.upstream.length > 0) {
        console.log('ExpressionAnalyzer - Processing upstream data:', {
          upstreamType: typeof data.upstream,
          upstreamLength: data.upstream.length
        });
        setupStream(safeJsonParse(data.upstream, { defaultValue: {} }));
      } else setupStream({});

      // Process pertCorr data
      if (data.pertCorr && data.pertCorr.length > 0) {
        console.log('ExpressionAnalyzer - Processing pertCorr data:', {
          pertCorrType: typeof data.pertCorr,
          pertCorrLength: data.pertCorr.length
        });
        setpertCorr(safeJsonParse(data.pertCorr, { defaultValue: {} }));
      } else setpertCorr({});

      // Process expCorr data
      if (data.expCorr && data.expCorr.length > 0) {
        console.log('ExpressionAnalyzer - Processing expCorr data:', {
          expCorrType: typeof data.expCorr,
          expCorrLength: data.expCorr.length
        });
        setexpCorr(safeJsonParse(data.expCorr, { defaultValue: {} }));
      } else setexpCorr({});
    }
  }, [data, isCalcRunning]);

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

  // Memoize expensive calculations
  const processedData = useMemo(() => {
    console.log('ExpressionAnalyzer - Processing data:', {
      hasData: !!data,
      hasBlacklistData: !!blacklistData,
      blacklistLoading,
      selectedTab: selectedTab.value,
      selectedInnerTab: selectedInnerTab.value,
      downstream: !!downstream,
      upstream: !!upstream,
      pertCorr: !!pertCorr,
      expCorr: !!expCorr
    });
    
    if (!data) return null;
    
    let highlightList = new Set(
      expressionanalyzerSettings?.genesTolabel
        .replaceAll(/[,\s;]+/g, "\n")
        .trimStart("\n")
        .split("\n")
    );
    highlightList = new Set([...highlightList]);

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

    if (!selectedData || Object.keys(selectedData).length === 0) {
      return { geneLists: {}, keyedData: [], pointData: [], pointDistribution: [], probes: [] };
    }

    const probesData = Object.keys(selectedData);
    const currentProbe = selectedProbe < probesData.length ? selectedProbe : 0;
    
    if (!selectedData[probesData[currentProbe]]) {
      return { geneLists: {}, keyedData: [], pointData: [], pointDistribution: [], probes: probesData };
    }

    let xValues = Object.values(selectedData[probesData[currentProbe]]);
    const labels = Object.keys(selectedData[probesData[currentProbe]]);

    let tableInfo = [];
    const pointData2 = [];

    let zScores = xValues;
    let binSize = 0.01;
    if (zScoreConv) {
      binSize = 0.05;
      zScores = calculateZscore(xValues);
    }

    var result = calculateDataDistribution(zScores, binSize);
    
    for (let i = 0; i < xValues.length; i++) {
      if (
        expressionanalyzerSettings.filter &&
        blacklistData &&
        xValues[i] < 0 &&
        blacklistData.blackListDown?.[labels[i]] !== undefined &&
        blacklistData.blackListDown[labels[i]] >
          expressionanalyzerSettings.filterBlackListed
      )
        continue;
      else if (
        expressionanalyzerSettings.filter &&
        blacklistData &&
        xValues[i] > 0 &&
        blacklistData.blackListUp?.[labels[i]] !== undefined &&
        blacklistData.blackListUp[labels[i]] > expressionanalyzerSettings.filterBlackListed
      )
        continue;

      if (
        ((zScoreConv && zScores[i] < 1.5 && zScores[i] > -1.5) ||
          (!zScoreConv && zScores[i] < 0.1 && zScores[i] > -0.1)) &&
        !highlightList.has(labels[i])
      ) {
        let randomNum = Math.floor(Math.random() * 10) + 1;
        if (randomNum < 7) continue;
      }

      let index = Math.floor((zScores[i] - result.min) / result.binSize);
      if (index >= result.bins.length) index = result.bins.length - 1;

      let binLoc = result.bins[Math.max(0, index)].count;
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

    const temp = {};

    if (selectedInnerTab.value === 0) {
      const genesLength = tableInfo.length;
      const upreg = [];
      const dowreg = [];
      tableInfo.forEach((gene) => {
        if (gene.Effect.startsWith("UP")) {
          upreg.push(gene.Gene);
        } else if (gene.Effect.startsWith("DOWN")) {
          dowreg.push(gene.Gene);
        }
      });
      const top20 = tableInfo.slice(0, 20).map((gene) => gene.Gene);
      const top50 = tableInfo.slice(0, 50).map((gene) => gene.Gene);
      const top100 = tableInfo.slice(0, 100).map((gene) => gene.Gene);
      const bottom20 = tableInfo
        .slice(Math.max(genesLength - 20, 0))
        .map((gene) => gene.Gene);
      const bottom50 = tableInfo
        .slice(Math.max(genesLength - 50, 0))
        .map((gene) => gene.Gene);
      const bottom100 = tableInfo
        .slice(Math.max(genesLength - 100, 0))
        .map((gene) => gene.Gene);

      if (upreg.length > 3) temp["Upregulated"] = upreg.join();
      if (dowreg.length > 3) temp["Downregulated"] = dowreg.join();
      if (top20.length > 3) temp["Top 20 Upregulated"] = top20.join();
      if (top50.length > 3) temp["Top 50 Upregulated"] = top50.join();
      if (top100.length > 3) temp["Top 100 Upregulated"] = top100.join();
      if (bottom20.length > 3) temp["Top 20 Downregulated"] = bottom20.join();
      if (bottom50.length > 3) temp["Top 50 Downregulated"] = bottom50.join();
      if (bottom100.length > 3)
        temp["Top 100 Downregulated"] = bottom100.join();
    } else {
      const strongPosCorr = [];
      const posCorr = [];
      const weakPosCorr = [];
      const strongNegCorr = [];
      const negCorr = [];
      const weakNegCorr = [];

      tableInfo.forEach((gene) => {
        const score = gene.Score;
        const geneName = gene.Gene;
        if (score > 0.8) {
          strongPosCorr.push(geneName);
        } else if (score > 0.5) {
          posCorr.push(geneName);
        } else if (score > 0.1) {
          weakPosCorr.push(geneName);
        } else if (score < -0.8) {
          strongNegCorr.push(geneName);
        } else if (score < -0.5) {
          negCorr.push(geneName);
        } else if (score < -0.1) {
          weakNegCorr.push(geneName);
        }
      });

      if (strongPosCorr.length > 3)
        temp["STRONG POSITIVE CORR"] = strongPosCorr.join();
      if (posCorr.length > 3) temp["POSITIVE CORR"] = posCorr.join();
      if (weakPosCorr.length > 3)
        temp["WEAK POSITIVE CORR"] = weakPosCorr.join();
      if (strongNegCorr.length > 3)
        temp["STRONG NEGATIVE CORR"] = strongNegCorr.join();
      if (negCorr.length > 3) temp["NEGATIVE CORR"] = negCorr.join();
      if (weakNegCorr.length > 3)
        temp["WEAK NEGATIVE CORR"] = weakNegCorr.join();
    }

    pointData2.sort((a, b) => b[0] - a[0]);

    return {
      geneLists: temp,
      keyedData: tableInfo,
      pointData: pointData2,
      pointDistribution: result.pointDistribution,
      probes: probesData
    };
  }, [
    data,
    coreSettings.targetGeneList,
    expressionanalyzerSettings,
    selectedTab.value,
    selectedInnerTab.value,
    downstream,
    upstream,
    pertCorr,
    expCorr,
    selectedProbe,
    blacklistData,
    blacklistLoading,
  ]);

  useEffect(() => {
    if (processedData) {
      setGeneLists(processedData.geneLists);
      setkeyedData(processedData.keyedData);
      setPointData(processedData.pointData);
      setPointDistribution(processedData.pointDistribution);
      setProbes(processedData.probes);
      if (processedData.probes.length === 1 && selectedProbe > 0) {
        setSelectedProbe(0);
      }
    }
  }, [processedData, selectedProbe]);

  //Set graph options
  const chartOptions = useMemo(() => {
    if (!data || !pointData.length) return {};
    
    return {
      tooltip: {
        formatter: function (params) {
          return params.data[2] + "<br> Score: " + params.data[0]?.toFixed(2);
        },
      },
      xAxis: [
        {
          type: "value",
          axisLine: {
            lineStyle: {
              color: "black",
            },
          },
          axisLabel: {
            color: "black",
            fontSize: 16,
          },
          axisTick: {
            lineStyle: {
              color: "black",
            },
          },
          name:
            selectedInnerTab.value === 0
              ? "Z-Score"
              : "Correlation Coefficient",
          nameTextStyle: {
            fontSize: 16,
            color: "black",
          },
          nameGap: 38,
          nameLocation: "middle",
        },
      ],
      yAxis: {
        show: false,
      },
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
            slider: { endValue: 0.5 },
          },
          restore: {},
          saveAsImage: {},
        },
      },
      grid: [
        {
          left: 50,
          top: 20,
          bottom: 100,
        },
      ],
      series: [
        {
          name: "Series 2",
          type: "line",
          roam: true,
          symbol: "none",
          lineStyle: {
            width: 0,
          },
          xAxisIndex: 0,
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
                return "rgba(216, 245, 39, 0.5)";
              else if (params.data[4] === true) {
                return "rgba(39, 96, 245, 0.7)";
              }
              else if (
                (selectedInnerTab.value === 0 && params.data[0] > 2) ||
                (selectedInnerTab.value === 1 && params.data[0] > 0.5)
              ) {
                return "rgba(39, 245, 55, 0.7)";
              } else if (
                (selectedInnerTab.value === 0 && params.data[0] < -2) ||
                (selectedInnerTab.value === 1 && params.data[0] < -0.5)
              ) {
                return "rgba(245, 55, 39, 0.7)";
              } else if (
                selectedInnerTab.value === 1 &&
                params.data[0] > 0.15
              ) {
                return "rgba(39, 245, 55, 0.4)";
              } else if (
                selectedInnerTab.value === 1 &&
                params.data[0] < -0.5
              ) {
                return "rgba(245, 55, 39, 0.4)";
              } else {
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
    };
  }, [
    pointData,
    data,
    pointDistribution,
    selectedInnerTab.value,
  ]);

  useEffect(() => {
    setOptions(chartOptions);
  }, [chartOptions]);

  return (
    <>
      {isCalcRunning ? (
        <LoadingPage />
      ) : (
        <>
          <Accordion defaultExpanded={true}
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
            <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>
              <div style={{ fontSize: '13px', color: '#424242' }}>
                <strong>Analysis Capabilities:</strong>
                <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
                  {moduleDescription.capabilities.map((capability, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>{capability}</li>
                  ))}
                </ul>
              </div>
              <p style={{ margin: '10px 0 0 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>

                
                <strong>Perturbation Effects: </strong> {moduleDescription.tabs.perturbationEffects}
                <br/>
                <strong>Perturbed By: </strong> {moduleDescription.tabs.perturbedBy}
              </p>
            </AccordionDetails>
          </Accordion>

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
                  {coreSettings.cellLine.id === "TFAtlas"
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
                  {coreSettings.cellLine.id === "TFAtlas"
                    ? " overexpression "
                    : " perturbation "}{" "}
                  of
                  {" " + expressionanalyzerSettings.selectedGene}?
                 <span style={{ color: 'red', fontWeight: 'bold' }}> Red highlighted</span> genes are down regulated, while <span style={{ color: 'green', fontWeight: 'bold' }}>green highlighted</span> genes are up regulated.
                </Text>
                <Spacer height={5} />
              </>
            )}
            {selectedInnerTab.value === 0 && selectedTab.value === 1 && (
              <>
                <Text success>
                  {coreSettings.cellLine.id === "TFAtlas"
                    ? " Overexpression "
                    : " Perturbation "}{" "}
                  of which{" "}
                  {coreSettings.cellLine.id === "TFAtlas"
                    ? " transcription factors "
                    : " genes "}{" "}
                  up or down regulate
                  {" " +
                    expressionanalyzerSettings.selectedGene +
                    " expression"}
                  ? <span style={{ color: 'red', fontWeight: 'bold' }}> Red highlighted</span> genes down regulate, while <span style={{ color: 'green', fontWeight: 'bold' }}>green highlighted</span> genes are up regulated.
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
            {blacklistLoading && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#e8f5e8', 
                borderLeft: '4px solid #4caf50',
                borderRadius: '4px',
                color: '#2e7d32',
                marginBottom: '8px'
              }}>
                🔄 Loading blacklist data for filtering...
              </div>
            )}
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
  // Note: data is passed as a prop from the parent page component
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
