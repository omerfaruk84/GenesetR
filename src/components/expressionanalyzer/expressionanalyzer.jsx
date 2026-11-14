import { PlotHelp } from "../plot-help";
import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
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
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import EnrichmentTable from "../enrichment-table-new";
import { GeneSetEnrichmentTable } from "../enrichment";

import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
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
import { createGeneTooltipFormatter, buildGeneScoreTooltip } from "../../utils/geneFunctionUtils";
import { withErrorBoundary } from "../error-boundary";
import { ModulePathNames } from "../../store/results/enums";
import { LoadingPage } from "../loading-page";
import { runCalculation } from "../../store/results";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "../side-bar/settings/enums";
import { fetchCellCycleComparisonV2 } from "../../store/api/v2";

const isDevEnv = process.env.NODE_ENV !== "production";
// Development-only logging.
const debugLog = (...args) => {
  if (isDevEnv) {
    // eslint-disable-next-line no-console
    console["log"](...args);
  }
};

const formatScore = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : undefined;

// Tooltip of the expression / correlation scatter.
// Point data: [score, jitterY, gene, rawScore, highlighted]
const createAnalyzerTooltipFormatter = (isCorrelationMode) =>
  createGeneTooltipFormatter({
    parseData: (params) => ({
      geneSymbol: params?.data?.[2],
      score: params?.data?.[0],
      originalScore: params?.data?.[3],
      isHighlighted: params?.data?.[4] === true,
    }),
    renderTooltip: (geneSymbol, geneInfo, parsed, state) => {
      const score = parsed.score;
      let analysis;
      if (isCorrelationMode) {
        analysis =
          score > 0.5
            ? { label: "Strong Positive Correlation", color: "#4caf50" }
            : score < -0.5
              ? { label: "Strong Negative Correlation", color: "#f44336" }
              : score > 0.2
                ? { label: "Moderate Positive Correlation", color: "#8bc34a" }
                : score < -0.2
                  ? { label: "Moderate Negative Correlation", color: "#ff5722" }
                  : { label: "Weak Correlation", color: "#9e9e9e" };
      } else {
        analysis =
          score > 2
            ? { label: "Strong Upregulation", color: "#4caf50" }
            : score < -2
              ? { label: "Strong Downregulation", color: "#f44336" }
              : score > 0.5
                ? { label: "Moderate Upregulation", color: "#8bc34a" }
                : score < -0.5
                  ? { label: "Moderate Downregulation", color: "#ff5722" }
                  : { label: "No Significant Change", color: "#9e9e9e" };
      }
      const rows = [
        { label: "Analysis", value: analysis.label, color: analysis.color, bold: true },
        {
          label: isCorrelationMode ? "Correlation Score" : "Expression Score",
          value: formatScore(score),
        },
      ];
      if (parsed.originalScore !== undefined && parsed.originalScore !== score) {
        rows.push({ label: "Raw Score", value: formatScore(parsed.originalScore) });
      }
      return buildGeneScoreTooltip({
        geneSymbol,
        geneInfo,
        state,
        highlighted: parsed.isHighlighted,
        rows,
      });
    },
  });

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
  LegendComponent,
  DataZoomSliderComponent,
  TooltipComponent,
  GridComponent,
  ScatterChart,
  LineChart,
  BarChart,
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
  const [selectedView, setSelectedView] = useState(0);
  const [options, setOptions] = useState({});
  const [pointData, setPointData] = useState([]);
  const [probes, setProbes] = useState([]);
  const [selectedProbe, setSelectedProbe] = useState(0);
  const [pointDistribution, setPointDistribution] = useState([]);
  const [keyedData, setkeyedData] = useState([{}]);
  const [selectedTab, setSelectedTab] = useState({
    label: "Perturbation Effects (Downstream Effects)",
    value: 0,
  });
  const [selectedInnerTab, setSelectedInnerTab] = useState({
    label: "Downstream Targets",
    value: 0,
  });
  const [genelists, setGeneLists] = useState([]);

  const [downstream, setdownStream] = useState({});
  const [upstream, setupStream] = useState({});
  const [pertCorr, setpertCorr] = useState({});
  const [expCorr, setexpCorr] = useState({});
  const [isCalcRunning, setisRunning] = useState(false);

  const [cellCycleData, setCellCycleData] = useState(null);
  const [cellCycleLoading, setCellCycleLoading] = useState(false);
  const [cellCycleError, setCellCycleError] = useState(null);
  const [cellCycleView, setCellCycleView] = useState("overview");
  const [tabOptions, settabOptions] = useState([
    {
      label: "Perturbation Effects (Downstream Effects)",
      value: 0,
      disabled: false,
    },
    {
      label: "Perturbed By (Upstream Regulators)",
      value: 1,
      disabled: false,
    },
  ]);
  // Dynamic inner tab options based on selected outer tab
  const getInnerTabOptions = () => {
    if (selectedTab.value === 0) {
      // Perturbation Effects (Downstream Effects)
      return [
        {
          label: "Downstream Targets",
          value: 0,
          disabled: false,
        },
        {
          label: "Correlation (Similar Perturbations)",
          value: 1,
          disabled: false,
        },
      ];
    } else {
      // Perturbed By (Upstream Regulators)
      return [
        {
          label: "Upstream Regulators",
          value: 0,
          disabled: false,
        },
        {
          label: "Correlation (Similar Expressional Profile)",
          value: 1,
          disabled: false,
        },
      ];
    }
  };

  const [innerTabOptions, setinnerTabOptions] = useState(getInnerTabOptions());
  const location = useLocation();
  const { pathname } = location;

  // Update inner tab options when outer tab changes
  useEffect(() => {
    const newInnerTabOptions = getInnerTabOptions();
    setinnerTabOptions(newInnerTabOptions);
    // Reset to first inner tab when outer tab changes
    setSelectedInnerTab({ value: 0, label: newInnerTabOptions[0].label });
  }, [selectedTab.value]);

  useEffect(() => {
    runCalculation(pathname);
    coreSettingsChanged({
      settingName: CoreSettingsTypes.SHOW_HELP,
      newValue: false,
    });
  }, [coreSettings.cellLine.id, runCalculation, pathname, coreSettingsChanged]);

  useEffect(() => {
    let cancelled = false;

    const loadCellCycle = async () => {
      const target = expressionanalyzerSettings?.selectedGene;
      const datasetKey = coreSettings?.cellLine?.id;

      if (!target || !datasetKey) {
        setCellCycleData(null);
        setCellCycleError(null);
        return;
      }

      setCellCycleLoading(true);
      setCellCycleError(null);

      try {
        const result = await fetchCellCycleComparisonV2({
          datasetKey,
          target,
          level: "gene",
          control: "Non-Targeting",
          smooth: true,
        });
        if (!cancelled) {
          setCellCycleData(result);
        }
      } catch (e) {
        if (!cancelled) {
          setCellCycleData(null);
          setCellCycleError(e?.message || String(e));
        }
      } finally {
        if (!cancelled) {
          setCellCycleLoading(false);
        }
      }
    };

    loadCellCycle();
    return () => {
      cancelled = true;
    };
  }, [coreSettings?.cellLine?.id, expressionanalyzerSettings?.selectedGene]);

  useEffect(() => {
    setisRunning(
      calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running
    );
  }, [calcResults?.[ModulePathNames["/expressionanalyzer"]]?.running]);

  useEffect(() => {
    debugLog('ExpressionAnalyzer - Data processing useEffect triggered:', {
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
        debugLog('ExpressionAnalyzer - Processing downstream data:', {
          downstreamType: typeof data.downstream,
          downstreamLength: data.downstream.length
        });
        // New array/objects: never mutate state in place
        settabOptions((prev) =>
          prev.map((tab, idx) => (idx === 0 ? { ...tab, disabled: false } : tab))
        );
        setdownStream(safeJsonParse(data.downstream, { defaultValue: {} }));
      } else {
        setdownStream({});
        settabOptions((prev) =>
          prev.map((tab, idx) => (idx === 0 ? { ...tab, disabled: true } : tab))
        );
        setSelectedTab({ label: tabOptions[1].label, value: tabOptions[1].value });
      }

      // Process upstream data
      if (data.upstream && data.upstream.length > 0) {
        debugLog('ExpressionAnalyzer - Processing upstream data:', {
          upstreamType: typeof data.upstream,
          upstreamLength: data.upstream.length
        });
        setupStream(safeJsonParse(data.upstream, { defaultValue: {} }));
      } else setupStream({});

      // Process pertCorr data
      if (data.pertCorr && data.pertCorr.length > 0) {
        debugLog('ExpressionAnalyzer - Processing pertCorr data:', {
          pertCorrType: typeof data.pertCorr,
          pertCorrLength: data.pertCorr.length
        });
        setpertCorr(safeJsonParse(data.pertCorr, { defaultValue: {} }));
      } else setpertCorr({});

      // Process expCorr data
      if (data.expCorr && data.expCorr.length > 0) {
        debugLog('ExpressionAnalyzer - Processing expCorr data:', {
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

    // Nothing to average (empty probe)
    if (trimmedArr.length === 0) return { mean: 0, std: 1 };

    // Calculate the mean of the remaining elements
    const mean = trimmedArr.reduce((a, b) => a + b, 0) / trimmedArr.length;
    const std = Math.sqrt(
      trimmedArr.reduce((a, b) => a + (b - mean) ** 2, 0) /
        (trimmedArr.length - 1)
    );

    return { mean: mean, std: std };
  }



  function calculateZscore(data) {
    var results = trimmedMean(data, 0.2);
    // Guard against degenerate distributions (single value / zero variance),
    // which would turn every z-score into NaN.
    if (!Number.isFinite(results.mean)) results.mean = 0;
    if (!Number.isFinite(results.std) || results.std === 0) results.std = 1;
    // Calculate the Z-scores for each data point
    return data.map((value) => (value - results.mean) / results.std);
  }

  function calculateDataDistribution(data, binSize = 0.05) {
    // Determine the range of the data
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let num of data) {
      if (!Number.isFinite(num)) continue;
      if (num < min) {
        min = num;
      }
      if (num > max) {
        max = num;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 0;
    }

    // Initialize bins (always at least one)
    let bins = [];
    const binCount = Math.floor((max - min) / binSize) + 1;
    for (let b = 0; b < binCount; b++) {
      const start = min + b * binSize;
      bins.push({ binStart: start, binEnd: start + binSize, count: 0 });
    }

    // Iterate through data and increment the count of the corresponding bin
    for (let value of data) {
      if (!Number.isFinite(value)) continue;
      let binIndex = Math.floor((value - min) / binSize);
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
    debugLog('ExpressionAnalyzer - Processing data:', {
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
    
    // Genes to label (case-insensitive; a "_2" guide matches its gene)
    const highlightSet = new Set(
      String(expressionanalyzerSettings?.genesTolabel || "")
        .split(/[,\s;]+/)
        .filter(Boolean)
        .map((gene) => gene.toUpperCase())
    );
    const isHighlighted = (label) => {
      const upper = String(label ?? "").toUpperCase();
      return highlightSet.has(upper) || highlightSet.has(upper.split("_")[0]);
    };

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

      const highlighted = isHighlighted(labels[i]);

      // Only the scatter is thinned: non-significant points are sampled so the
      // chart stays responsive. The table below always gets every row.
      const isNonSignificant =
        (zScoreConv && zScores[i] < 1.5 && zScores[i] > -1.5) ||
        (!zScoreConv && zScores[i] < 0.1 && zScores[i] > -0.1);
      const drawPoint =
        !isNonSignificant ||
        highlighted ||
        Math.floor(Math.random() * 10) + 1 >= 7;

      if (drawPoint) {
        let index = Math.floor((zScores[i] - result.min) / result.binSize);
        if (!Number.isFinite(index)) index = 0;
        if (index >= result.bins.length) index = result.bins.length - 1;

        let binLoc = result.bins[Math.max(0, index)]?.count || 0;
        let histY = Math.random() * 2 * binLoc - binLoc;
        pointData2.push([
          zScores[i],
          histY,
          labels[i],
          xValues[i],
          highlighted,
        ]);
      }

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
        extraCssText: "width:auto; white-space:normal; max-width: 400px; z-index: 9999; padding: 12px; line-height: 1.5;",
        confine: true,
        backgroundColor: "#ffffff",
        borderColor: "#e0e0e0",
        borderWidth: 1,
        // Shared formatter: cached gene info, escaped HTML, and it never
        // stays on "Loading..." when Harmonizome has no entry for a gene.
        formatter: createAnalyzerTooltipFormatter(selectedInnerTab.value === 1),
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
          mySvg: svgToolboxFeature("genesetr-expression"),
          myPdf: pdfToolboxFeature("genesetr-expression"),
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
                params.data[0] < -0.15
              ) {
                // moderate negative correlation (mirror of the > 0.15 branch)
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
    selectedTab.value,
  ]);

  useEffect(() => {
    setOptions(chartOptions);
  }, [chartOptions]);

  const cellCyclePhaseOption = useMemo(() => {
    if (!cellCycleData?.target?.phase_pct || !cellCycleData?.control?.phase_pct) return null;

    const pct = (x) => Math.round((x || 0) * 1000) / 10;
    const c = cellCycleData.control.phase_pct;
    const t = cellCycleData.target.phase_pct;

    return {
      title: {
        text: "Cell-cycle phase composition (%, Control vs Perturbation)",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => `${v}%`,
      },
      legend: { top: 28 },
      grid: { top: 64, left: 40, right: 20, bottom: 32, containLabel: true },
      xAxis: { type: "category", data: ["Control", "Perturbation"] },
      yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "G1",
          type: "bar",
          stack: "total",
          data: [pct(c.g1), pct(t.g1)],
          itemStyle: { color: "#4e79a7" },
        },
        {
          name: "S",
          type: "bar",
          stack: "total",
          data: [pct(c.s), pct(t.s)],
          itemStyle: { color: "#59a14f" },
        },
        {
          name: "G2M",
          type: "bar",
          stack: "total",
          data: [pct(c.g2m), pct(t.g2m)],
          itemStyle: { color: "#e15759" },
        },
      ],
    };
  }, [cellCycleData]);

  const cellCyclePhaseGroupedOption = useMemo(() => {
    if (!cellCycleData?.target?.phase_pct || !cellCycleData?.control?.phase_pct) return null;

    const pct = (x) => Math.round((x || 0) * 1000) / 10;
    const c = cellCycleData.control.phase_pct;
    const t = cellCycleData.target.phase_pct;

    return {
      title: {
        text: "Cell-cycle phase composition (%, grouped)",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => `${v}%`,
      },
      legend: { top: 28 },
      grid: { top: 64, left: 40, right: 20, bottom: 32, containLabel: true },
      xAxis: { type: "category", data: ["G1", "S", "G2M"] },
      yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "Control",
          type: "bar",
          data: [pct(c.g1), pct(c.s), pct(c.g2m)],
          itemStyle: { color: "#9aa0a6" },
          barWidth: "35%",
        },
        {
          name: "Perturbation",
          type: "bar",
          data: [pct(t.g1), pct(t.s), pct(t.g2m)],
          itemStyle: { color: "#1a73e8" },
          barWidth: "35%",
        },
      ],
    };
  }, [cellCycleData]);

  const cellCycleScoreOption = useMemo(() => {
    if (!cellCycleData?.bins?.s?.x?.length || !cellCycleData?.bins?.g2m?.x?.length) return null;

    const makeOption = (scoreKey, title) => {
      const x = cellCycleData.bins[scoreKey].x;
      const yT = cellCycleData.bins[scoreKey].density_target;
      const yC = cellCycleData.bins[scoreKey].density_control;

      const t = cellCycleData.target;
      const c = cellCycleData.control;

      const meanT = scoreKey === "s" ? t.mean_s : t.mean_g2m;
      const meanC = scoreKey === "s" ? c.mean_s : c.mean_g2m;
      const medT = scoreKey === "s" ? t.q50_s : t.q50_g2m;
      const medC = scoreKey === "s" ? c.q50_s : c.q50_g2m;

      const toPairs = (xs, ys) => xs.map((v, i) => [v, ys[i] ?? 0]);

      return {
        title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
        tooltip: { trigger: "axis" },
        legend: { top: 28 },
        grid: { top: 64, left: 46, right: 18, bottom: 32, containLabel: true },
        xAxis: { type: "value", name: "Score" },
        yAxis: { type: "value", name: "Density" },
        series: [
          {
            name: "Control",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: toPairs(x, yC),
            lineStyle: { width: 2, color: "#9aa0a6" },
            areaStyle: { opacity: 0.12, color: "#9aa0a6" },
            markLine: {
              symbol: ["none", "none"],
              data: [
                { xAxis: meanC, name: "mean (ctrl)" },
                { xAxis: medC, name: "median (ctrl)" },
              ],
              lineStyle: { color: "#9aa0a6", type: "dashed" },
              label: { formatter: "{b}" },
            },
          },
          {
            name: "Perturbation",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: toPairs(x, yT),
            lineStyle: { width: 2, color: "#1a73e8" },
            areaStyle: { opacity: 0.12, color: "#1a73e8" },
            markLine: {
              symbol: ["none", "none"],
              data: [
                { xAxis: meanT, name: "mean (pert)" },
                { xAxis: medT, name: "median (pert)" },
              ],
              lineStyle: { color: "#1a73e8", type: "dashed" },
              label: { formatter: "{b}" },
            },
          },
        ],
      };
    };

    return {
      s: makeOption("s", "S score distribution (density)"),
      g2m: makeOption("g2m", "G2M score distribution (density)"),
    };
  }, [cellCycleData]);

  const cellCycleViolinOption = useMemo(() => {
    if (!cellCycleData?.bins?.s?.x?.length || !cellCycleData?.bins?.g2m?.x?.length) return null;

    const toPairs = (xs, ys, sign = 1) => xs.map((v, i) => [v, sign * (ys?.[i] ?? 0)]);

    const makeHalfViolin = (scoreKey, title) => {
      const x = cellCycleData.bins[scoreKey].x;
      const yT = cellCycleData.bins[scoreKey].density_target;
      const yC = cellCycleData.bins[scoreKey].density_control;

      const maxD = Math.max(
        1e-12,
        ...yT.map((v) => Math.abs(v || 0)),
        ...yC.map((v) => Math.abs(v || 0))
      );
      const yMax = maxD * 1.12;

      const t = cellCycleData.target;
      const c = cellCycleData.control;
      const meanT = scoreKey === "s" ? t.mean_s : t.mean_g2m;
      const meanC = scoreKey === "s" ? c.mean_s : c.mean_g2m;

      return {
        title: { text: title, left: "center", textStyle: { fontSize: 14, fontWeight: 600 } },
        tooltip: {
          trigger: "axis",
          valueFormatter: (v) => Math.abs(v).toExponential(2),
        },
        legend: { top: 28 },
        grid: { top: 64, left: 46, right: 18, bottom: 32, containLabel: true },
        xAxis: { type: "value", name: "Score" },
        yAxis: {
          type: "value",
          min: -yMax,
          max: yMax,
          name: "Density",
          axisLabel: { show: false },
          splitLine: { lineStyle: { color: "#eef1f4" } },
        },
        series: [
          {
            name: "Control",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: toPairs(x, yC, -1),
            lineStyle: { width: 1.5, color: "#9aa0a6" },
            areaStyle: { opacity: 0.25, color: "#9aa0a6" },
          },
          {
            name: "Perturbation",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: toPairs(x, yT, 1),
            lineStyle: { width: 1.5, color: "#1a73e8" },
            areaStyle: { opacity: 0.25, color: "#1a73e8" },
            markLine: {
              symbol: ["none", "none"],
              data: [
                {
                  xAxis: meanC,
                  name: "mean (ctrl)",
                  lineStyle: { color: "#9aa0a6", type: "dashed" },
                  label: { formatter: "{b}" },
                },
                {
                  xAxis: meanT,
                  name: "mean (pert)",
                  lineStyle: { color: "#1a73e8", type: "dashed" },
                  label: { formatter: "{b}" },
                },
                {
                  yAxis: 0,
                  name: "",
                  lineStyle: { color: "#cfd4da", type: "solid" },
                  label: { show: false },
                },
              ],
            },
          },
        ],
      };
    };

    return {
      s: makeHalfViolin("s", "S score half-violin (Control ↔ Perturbation)"),
      g2m: makeHalfViolin("g2m", "G2M score half-violin (Control ↔ Perturbation)"),
    };
  }, [cellCycleData]);

  // Get progress state
  const progressMessage = calcResults?.[ModulePathNames["/expressionanalyzer"]]?.progressMessage;
  const progressPercentage = calcResults?.[ModulePathNames["/expressionanalyzer"]]?.progressPercentage;

  return (
    <>
      {isCalcRunning && (
        <LoadingPage 
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}
      {!isCalcRunning && (
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

          <Card bordered className={styles.cellCyclePanel}>
            <div className={styles.cellCycleHeader}>
              <div>
                <div className={styles.cellCycleTitle}>Cell-cycle impact</div>
                <div className={styles.cellCycleSubtitle}>
                  {coreSettings?.cellLine?.id ? `Dataset: ${coreSettings.cellLine.id}` : ""}
                  {expressionanalyzerSettings?.selectedGene ? ` • Perturbation: ${expressionanalyzerSettings.selectedGene}` : ""}
                  {cellCycleData?.control?.gene_target ? ` • Control: ${cellCycleData.control.gene_target}` : ""}
                </div>
              </div>
              <div className={styles.cellCycleHeaderRight}>
                <div className={styles.cellCycleHeaderControlLabel}>View</div>
                <Select
                  width={240}
                  options={[
                    { label: "Overview (bars + violins)", value: "overview" },
                    { label: "Detailed (stacked + density)", value: "detailed" },
                  ]}
                  value={cellCycleView}
                  onChange={({ target: { value } }) => setCellCycleView(value)}
                />
              </div>
            </div>

            {cellCycleLoading && (
              <Text className={styles.cellCycleStatus}>Loading cell-cycle summaries…</Text>
            )}

            {!cellCycleLoading && cellCycleError && (
              <Text className={styles.cellCycleStatusError}>
                Cell-cycle data unavailable: {cellCycleError}
              </Text>
            )}

            {!cellCycleLoading && !cellCycleError && !cellCycleData && (
              <Text className={styles.cellCycleStatus}>
                Select a dataset and perturbation to view cell-cycle effects.
              </Text>
            )}

            {!cellCycleLoading && !cellCycleError && cellCycleData && (
              <>
                <div className={styles.cellCycleCards}>
                  <div className={styles.cellCycleStatCard}>
                    <div className={styles.cellCycleStatLabel}>Cells (pert)</div>
                    <div className={styles.cellCycleStatValue}>
                      {(cellCycleData.target?.n_cells || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.cellCycleStatCard}>
                    <div className={styles.cellCycleStatLabel}>Cells (ctrl)</div>
                    <div className={styles.cellCycleStatValue}>
                      {(cellCycleData.control?.n_cells || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.cellCycleStatCard}>
                    <div className={styles.cellCycleStatLabel}>Δ mean (S)</div>
                    <div className={styles.cellCycleStatValue}>
                      {(cellCycleData.deltas?.delta_mean_s ?? 0).toFixed(3)}
                    </div>
                  </div>
                  <div className={styles.cellCycleStatCard}>
                    <div className={styles.cellCycleStatLabel}>Δ mean (G2M)</div>
                    <div className={styles.cellCycleStatValue}>
                      {(cellCycleData.deltas?.delta_mean_g2m ?? 0).toFixed(3)}
                    </div>
                  </div>
                </div>

                <div className={styles.cellCycleCharts}>
                  {cellCycleView === "overview" && (
                    <>
                      {cellCyclePhaseGroupedOption && (
                        <div className={styles.cellCycleChart}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCyclePhaseGroupedOption}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}

                      {cellCycleViolinOption?.s && (
                        <div className={styles.cellCycleChart}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCycleViolinOption.s}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}

                      {cellCycleViolinOption?.g2m && (
                        <div className={styles.cellCycleChart}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCycleViolinOption.g2m}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {cellCycleView === "detailed" && (
                    <>
                      {cellCyclePhaseOption && (
                        <div className={styles.cellCycleChartWide}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCyclePhaseOption}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}

                      {cellCycleScoreOption?.s && (
                        <div className={styles.cellCycleChart}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCycleScoreOption.s}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}

                      {cellCycleScoreOption?.g2m && (
                        <div className={styles.cellCycleChart}>
                          <ReactEChartsCore
                            echarts={echarts}
                            option={cellCycleScoreOption.g2m}
                            notMerge={true}
                            lazyUpdate={true}
                            style={{ height: 260, width: "100%" }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </Card>

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
              options={getInnerTabOptions()}
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
      <PlotHelp kind="expressionAnalyzer" />
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

const ConnectedExpressionAnalyzer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpressionAnalyzer);

const MainContainer = withErrorBoundary(ConnectedExpressionAnalyzer, {
  label: "Expression analyzer",
  resetKeys: (props) => [props.data],
});

export { MainContainer as ExpressionAnalyzer };
