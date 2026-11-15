import { pdfToolboxFeature, svgToolboxFeature } from "../../utils/exporters";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { connect } from "react-redux";
import { ScatterPlot } from "../../components/scatterPlot";
import styles from "./dim-reduction-page.module.scss";
import "echarts-gl";
import * as echarts from "echarts/core";
//import GraphChart from 'echarts/charts';
import { CustomChart, LineChart, BarChart } from "echarts/charts";
import { ROUTES } from "../../common/routes";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "../../components/side-bar/settings/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/2.webm";
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
import { LoadingPage } from "../../components/loading-page";
import { ModuleIntro, Notice, Panel } from "../../components/ui";
import { saveImageFeature, useChartTheme } from "../../utils/chartTheme";


// Add module description for Dimensionality Reduction
const moduleDescription = {
  title: "Dimensionality Reduction & Clustering Module",
  description: "High dimensionality in large datasets makes visualization challenging and increases computational burden. This module reduces the number of features while preserving original information, then applies clustering to identify patterns in gene perturbation data.",
  features: [
    "PCA: Linear method using variance threshold to determine minimum components needed",
    "t-SNE, UMAP, MDE: Non-linear methods that preserve complex feature relationships", 
    "HDBSCAN clustering: Identifies clusters of varied shapes and sizes without specifying cluster number",
    "Gene Set Enrichment Analysis (GSEA) on identified clusters using EnrichR API",
    "Interactive visualizations with customizable parameters for optimization",
    "Filtering options for cluster size, sample numbers, and clustering metrics"
  ]
};

echarts.use([
  TitleComponent,
  LegendPlainComponent,
  LegendScrollComponent,
  CustomChart,
  BrushComponent,
  VisualMapComponent,
  TransformComponent,
  TooltipComponent,
  GridComponent,
  LineChart,
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
]);

const DimReductionPage = ({
  tsneResults,
  umapResults,
  mdeResults,
  pcaResults,
  precomputedResults,
  coreSettingsChanged,
  coreSettings,
  calcResults,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Get current DR method from settings
  const currentMethod = coreSettings?.currentModule || "pca";

  // Label of the sidebar button for the selected method (see side-bar/index.jsx)
  const drButtonLabels = {
    pca: "Calculate PCA",
    mde: "Calculate MDE",
    umap: "Calculate UMAP",
    tsne: "Calculate t-SNE",
  };
  const drButtonLabel = drButtonLabels[currentMethod] || "Run Calculation";

  // Check if any calculation is running
  const isCalculationRunning =
    calcResults?.["tsneGraph"]?.running ||
    calcResults?.["umapGraph"]?.running ||
    calcResults?.["mdeGraph"]?.running ||
    calcResults?.["pcaGraph"]?.running;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || tsneResults || umapResults || mdeResults || pcaResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, tsneResults, umapResults, mdeResults, pcaResults]);

  // Effect to load pending gene list from localStorage (when opened from enrichment table)
  useEffect(() => {
    // Add a small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      const pendingDataKey = `pendingGeneList_/dr`;
      const pendingData = localStorage.getItem(pendingDataKey);
      
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData);
          // Check if data is recent (within last 30 seconds) to avoid stale data
          if (Date.now() - data.timestamp < 30000) {
            console.log('Loading gene list from localStorage:', data);
            
            // For DR, we're setting perturbation list, so clear target gene list first
            // to avoid showing genes in both lists
            if (data.settingName === CoreSettingsTypes.PETURBATION_LIST) {
              // Clear target gene list first (synchronously)
              coreSettingsChanged({
                settingName: CoreSettingsTypes.TARGET_LIST,
                newValue: "",
              });
              
              // Set the perturbation list in Redux immediately after clearing
              // Use a small delay to ensure Redux state updates properly
              setTimeout(() => {
                coreSettingsChanged({
                  settingName: data.settingName,
                  newValue: data.value,
                });
              }, 100);
            } else {
              // Set the gene list in Redux immediately for other cases
              coreSettingsChanged({
                settingName: data.settingName,
                newValue: data.value,
              });
            }
            
            // Remove from localStorage after using
            localStorage.removeItem(pendingDataKey);
          } else {
            console.log('Pending gene list expired, removing from localStorage');
            localStorage.removeItem(pendingDataKey);
          }
        } catch (error) {
          console.error('Error loading pending gene list:', error);
          localStorage.removeItem(pendingDataKey);
        }
      }
    }, 100); // 100ms delay to ensure page is loaded

    return () => clearTimeout(timer);
  }, [coreSettingsChanged]);

  const [graphoptions, setOptions] = useState({});
  const chart = useChartTheme();

  // Check if any DR calculation is running
  const isAnyCalculationRunning =
    calcResults?.["pcaGraph"]?.running ||
    calcResults?.["mdeGraph"]?.running ||
    calcResults?.["tsneGraph"]?.running ||
    calcResults?.["umapGraph"]?.running;

  // Get progress state from the currently running calculation
  const getProgressState = () => {
    if (calcResults?.["pcaGraph"]?.running) {
      return {
        message: calcResults["pcaGraph"].progressMessage,
        percentage: calcResults["pcaGraph"].progressPercentage,
      };
    } else if (calcResults?.["mdeGraph"]?.running) {
      return {
        message: calcResults["mdeGraph"].progressMessage,
        percentage: calcResults["mdeGraph"].progressPercentage,
      };
    } else if (calcResults?.["tsneGraph"]?.running) {
      return {
        message: calcResults["tsneGraph"].progressMessage,
        percentage: calcResults["tsneGraph"].progressPercentage,
      };
    } else if (calcResults?.["umapGraph"]?.running) {
      return {
        message: calcResults["umapGraph"].progressMessage,
        percentage: calcResults["umapGraph"].progressPercentage,
      };
    }
    return { message: null, percentage: null };
  };

  const progressState = getProgressState();

  useEffect(() => {
    var cumulative_ratio = [];
    var explained_ratio = [];
    if (pcaResults && pcaResults.ratio) {
      explained_ratio = [...pcaResults.ratio].map((val) => val * 100);
      cumulative_ratio = [...explained_ratio];
      for (let i = 1; i < cumulative_ratio.length; i++)
        cumulative_ratio[i] = explained_ratio[i] + cumulative_ratio[i - 1];

      const p = chart.p;
      const axisName = { fontWeight: 500, fontSize: 13 };
      const percent = (value) => value.toFixed(2) + " %";
      setOptions({
        grid: { left: 70, right: 70, top: 46, bottom: 78 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
        },
        dataZoom: [
          {
            show: true,
            realtime: true,
            height: 18,
            bottom: 12,
          },
          {
            type: "inside",
            realtime: true,
          },
        ],
        toolbox: {
          right: 8,
          feature: {
            dataView: { show: true, readOnly: false },
            magicType: { show: true, type: ["line", "bar"] },
            restore: { show: true },
            saveAsImage: saveImageFeature(p, "genesetr-pca-variance"),
            mySvg: svgToolboxFeature("genesetr-pca-variance"),
            myPdf: pdfToolboxFeature("genesetr-pca-variance"),
          },
        },
        legend: {
          left: "center",
          top: 6,
          itemGap: 22,
          data: ["Variance Explained", "Cumulative Variance Explained"],
        },
        xAxis: [
          {
            type: "category",
            // Principal components are numbered from 1
            data: explained_ratio.map((_, index) => "PC" + (index + 1)),
            axisTick: { alignWithLabel: true },
          },
        ],
        yAxis: [
          {
            nameRotate: 90,
            nameLocation: "center",
            nameGap: 48,
            nameTextStyle: axisName,
            type: "value",
            min: 0,
            // The axis ends on a whole tick above PC1. (It used to end exactly on
            // PC1's value, which gave a last label like "37.42318034172058 %".)
            // The step is never 0: a flat spectrum (PC1 < 2.5 %) would leave no ticks.
            max:
              Math.ceil(explained_ratio[0] / Math.max(1, Math.round(explained_ratio[0] / 5))) *
              Math.max(1, Math.round(explained_ratio[0] / 5)),
            name: "Variance explained",
            interval: Math.max(1, Math.round(explained_ratio[0] / 5)),
            axisLabel: {
              formatter: "{value} %",
            },
          },
          {
            nameRotate: 90,
            nameLocation: "center",
            nameGap: 52,
            nameTextStyle: axisName,
            name: "Cumulative variance explained",
            type: "value",
            min: 0,
            max: 100,
            interval: 20,
            // one set of grid lines (of the left axis) is enough
            splitLine: { show: false },
            axisLabel: {
              formatter: "{value} %",
            },
          },
        ],
        series: [
          {
            name: "Variance Explained",
            type: "bar",
            barMaxWidth: 26,
            itemStyle: { color: p.series[0], borderRadius: [2, 2, 0, 0] },
            tooltip: { valueFormatter: percent },
            data: explained_ratio,
          },
          {
            name: "Cumulative Variance Explained",
            type: "line",
            yAxisIndex: 1,
            symbol: "circle",
            symbolSize: 5,
            lineStyle: { color: p.accent, width: 2 },
            itemStyle: { color: p.accent },
            tooltip: { valueFormatter: percent },
            data: cumulative_ratio,
          },
        ],
      });
    }
  }, [pcaResults, chart.p]);

  let graphdata = undefined;
  let content = undefined;

  if (currentMethod === "tsne") graphdata = tsneResults;
  else if (currentMethod === "umap") graphdata = umapResults;
  else if (currentMethod === "pca") graphdata = pcaResults;
  else if (currentMethod === "mde") graphdata = mdeResults;
  else if (currentMethod === "precomputed") graphdata = precomputedResults;

  const howTo = (name) => (
    <p>
      <strong>To perform {name} analysis,</strong> enter your gene list in the perturbation list
      on the left, then click <strong>"{drButtonLabel}"</strong>. The results are shown in this
      panel. You can run the calculation several times with different parameters, or run the
      other methods one after another.
    </p>
  );

  if (currentMethod === "tsne" && graphdata === null) {
    content = (
      <Panel title="About t-SNE" bodyClassName={styles.about}>
        <p>
          <strong>t-SNE</strong> is a non-linear dimensionality reduction technique. It aids in the
          visual interpretation of GWPS data by transforming the high-dimensional expression
          changes associated with each perturbation into a lower-dimensional map. Similar
          perturbations, based on their effects on gene expression, are represented by points
          that are close together on the map. This allows for the identification of functionally
          related genes or perturbations and the exploration of genetic networks, as
          perturbations that have similar effects likely target the same pathways or biological
          processes. Thus, t-SNE is a valuable approach for probing complex GWPS data, revealing
          underlying patterns and structures that can guide further analysis and research.
        </p>
        {howTo("t-SNE")}
      </Panel>
    );
  } else if (currentMethod === "umap" && graphdata === null) {
    content = (
      <Panel title="About UMAP" bodyClassName={styles.about}>
        <p>
          <strong>Uniform Manifold Approximation and Projection</strong> (UMAP) is a
          dimensionality reduction technique that is particularly useful for visualizing
          high-dimensional datasets in a lower-dimensional space, typically 2D or 3D.
        </p>
        <p>
          Both t-SNE and UMAP are effective at preserving local structure, meaning that data
          points that are close together in the high-dimensional space will remain close in the
          lower-dimensional representation. However, UMAP generally does a better job of
          preserving the global structure of the data, ensuring that data point distance is
          similar in both high- and low-dimensional space. t-SNE tends to prioritize local over
          global relationships, which can sometimes result in misleading representations when
          the goal is to uncover the broader relationships in the data.
        </p>
        {howTo("UMAP")}
      </Panel>
    );
  } else if (currentMethod === "mde" && graphdata === null) {
    content = (
      <Panel title="About MDE" bodyClassName={styles.about}>
        <p>
          <strong>Minimum Distortion Embedding</strong> (MDE) is a nonlinear dimensionality
          reduction method used in the field of data analysis. The "distortion" in MDE refers to
          the discrepancy between distances (or more generally, relationships) in the
          high-dimensional data and the lower-dimensional representation. The goal of MDE is to
          minimize this distortion, thereby maintaining a faithful representation of the
          relationships within the data.
        </p>
        <p>
          In our extensive benchmarking of various dimensionality reduction (DR) algorithms, MDE
          had superior performance at an optimal number of components (NOC) of 43, yielding the
          highest clustering score of 48 and identifying up to 15 distinct clusters. However, MDE
          had limitations in handling high NOC values ({">"} 150 components).
        </p>
        <p>
          With the aim to improve clustering, we combined PCA with the non-linear DR algorithms
          and observed that the combination of PCA and MDE provided the best clustering results
          with increasing scores up to an impressive 80. This combination generated up to 23
          clusters covering almost all genes, with 12 clusters having a score {">"}1. It is
          noteworthy that the computation cost of the PCA-MDE combination remained acceptable in
          comparison to other methods. Thus, in light of efficiency, computation time, and
          quality of clustering, PCA-MDE integration appears to be the most efficient approach in
          our tests.
        </p>
        {howTo("MDE")}
      </Panel>
    );
  } else if (currentMethod === "pca") {
    content = (
      <div className={styles.submainView}>
        {pcaResults ? (
          <>
            <Panel
              title="Variance explained"
              subtitle={`${pcaResults.ratio?.length ?? 0} principal components`}
              flush
            >
              <div className={styles.scree}>
                <ReactEChartsCore
                  echarts={echarts}
                  theme={chart.theme}
                  option={graphoptions}
                  style={{ height: "100%", width: "100%" }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </Panel>

            <ScatterPlot graphData={pcaResults} />
          </>
        ) : (
          <Panel title="About PCA" bodyClassName={styles.about}>
            <img alt="PCA" src="/images/PCA.png" className={styles.aboutImage} />
            <p>
              Principal Component Analysis (PCA) aids visualization and interpretation of rich
              datasets by reducing their dimensionality with minimal information loss. Given a
              dataset with an N-dimensional space, where N represents the number of variables
              under investigation, PCA summarizes the data by making a linear transformation of
              vectors into a new coordinate system with fewer, uncorrelated variables - the
              Principal Components. These variables successively maximize variance from the
              original matrix and graphically simplify the identification of trends, clusters,
              and correlation among the subjects to analysis.
            </p>
            {howTo("PCA")}
          </Panel>
        )}
      </div>
    );
  }

  return (
    <div className={styles.mainView}>
      <ModuleIntro
        title={moduleDescription.title}
        description={moduleDescription.description}
        features={moduleDescription.features}
        expanded={isDescriptionExpanded}
        onChange={setIsDescriptionExpanded}
      />

      {isAnyCalculationRunning && (
        <LoadingPage 
          progressMessage={progressState.message}
          progressPercentage={progressState.percentage}
        />
      )}
      
      {!isAnyCalculationRunning && (
        <>
      {!tsneResults && !umapResults && !mdeResults && !pcaResults && (
        <Notice kind="info">
          To start, select a DR method in the settings panel, enter your gene list in the input box, and click the <strong>"{drButtonLabel}"</strong> button.
        </Notice>
      )}

      {currentMethod === "pca" ? (
        <>
        {content}
        {!pcaResults && <VideoHelpPage videoFile={helpVideo} />}
        </>
      ) : currentMethod === "precomputed" ? (
        graphdata !== null ? (
          <ScatterPlot graphData={graphdata} />
        ) : (
          <>
            <Notice kind="info">
              Select your parameters in the left sidebar and click "Load Pre-computed Data" to view the all-genes DR visualization.
            </Notice>
            <VideoHelpPage videoFile={helpVideo} />
          </>
        )
      ) : graphdata !== null ? (
        <ScatterPlot graphData={graphdata} />
      ) : (
        <>
        {content}
        <VideoHelpPage videoFile={helpVideo} />
        </>
      )}
        </>
      )}
    </div>
  );
};
//{currentMethod === "pca"? content : graphdata ? (<ScatterPlot graphData={graphdata} />):<></> }
const mapStateToProps = ({ calcResults, settings }) => ({
  calcResults,
  coreSettings: settings?.core ?? {},
  tsneResults: calcResults?.["tsneGraph"]?.result ?? null,
  mdeResults: calcResults?.["mdeGraph"]?.result ?? null,
  pcaResults: calcResults?.["pcaGraph"]?.result ?? null,
  umapResults: calcResults?.["umapGraph"]?.result ?? null,
  precomputedResults: calcResults?.["precomputedDrGraph"]?.result ?? null,
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DimReductionPage);
export { MainContainer as DimReductionPage };
