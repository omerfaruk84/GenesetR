import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { connect } from "react-redux";
import { ScatterPlot } from "../../components/scatterPlot";
import { Spacer, Tabs, Row } from "@oliasoft-open-source/react-ui-library";
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
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from "../../components/loading-page";


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

  const options = [
    {
      label: "PCA",
      value: "pca",
    },
    {
      label: "MDE",
      value: "mde",
    },
    {
      label: "UMAP",
      value: "umap",
    },
    {
      label: "tSNE",
      value: "tsne",
    },
    {
      label: "All Genes (Pre-computed)",
      value: "precomputed",
    },
  ];
  const [selectedTab, setSelectedTab] = useState(options[0]);
  const [graphoptions, setOptions] = useState({});
  
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
    //navigate("../dr/"+selectedTab.value)
    coreSettingsChanged({
      settingName: CoreSettingsTypes.CURRENT_MODULE,
      newValue: selectedTab.value,
    });
  }, [selectedTab]);

  useEffect(() => {
    var cumulative_ratio = [];
    var explained_ratio = [];
    if (pcaResults && pcaResults.ratio) {
      explained_ratio = [...pcaResults.ratio].map((val) => val * 100);
      cumulative_ratio = [...explained_ratio];
      for (let i = 1; i < cumulative_ratio.length; i++)
        cumulative_ratio[i] = explained_ratio[i] + cumulative_ratio[i - 1];

      setOptions({
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            crossStyle: {
              color: "#999",
            },
          },
        },
        dataZoom: [
          {
            show: true,
            realtime: true,
            xAxisIndex: [0, 1],
          },
          {
            type: "inside",
            realtime: true,
            xAxisIndex: [0, 1],
          },
        ],
        toolbox: {
          feature: {
            dataView: { show: true, readOnly: false },
            magicType: { show: true, type: ["line", "bar"] },
            restore: { show: true },
            saveAsImage: { show: true },
          },
        },
        legend: {
          data: ["Cummulative Variance Explained", "Variance Explained"],
        },
        xAxis: [
          {
            type: "category",
          },
        ],
        yAxis: [
          {
            nameRotate: 90,
            scale: true,
            nameLocation: "center",
            nameGap: 50,
            nameTextStyle: {
              fontWeight: "bold",
              fontSize: "14",
              verticalAlign: "center",
            },

            type: "value",
            min: 0,
            max: explained_ratio[0],
            name: "Variance exp.",
            interval: Math.round(explained_ratio[0] / 5),
            axisLabel: {
              formatter: "{value}  %",
            },
          },
          {
            nameRotate: 90,
            scale: true,
            nameLocation: "center",
            nameGap: 50,
            nameTextStyle: {
              fontWeight: "bold",
              fontSize: "14",
              verticalAlign: "center",
            },
            name: "Cumm. var. exp.",
            type: "value",
            min: 0,
            max: 100,
            interval: 20,
            axisLabel: {
              formatter: "{value} %",
            },
          },
        ],
        series: [
          {
            name: "Variance Explained",
            type: "bar",
            tooltip: {
              valueFormatter: function (value) {
                return value.toFixed(2);
              },
            },
            data: explained_ratio,
          },
          {
            name: "Cummulative Variance Explained",
            type: "line",
            yAxisIndex: 1,
            tooltip: {
              valueFormatter: function (value) {
                return value.toFixed(2) + " %";
              },
            },
            data: cumulative_ratio,
          },
        ],
      });
    }
  }, [pcaResults]);

  let graphdata = undefined;
  let content = undefined;

  if (selectedTab.value === "tsne") graphdata = tsneResults;
  else if (selectedTab.value === "umap") graphdata = umapResults;
  else if (selectedTab.value === "pca") graphdata = pcaResults;
  else if (selectedTab.value === "mde") graphdata = mdeResults;
  else if (selectedTab.value === "precomputed") graphdata = precomputedResults;

  if (selectedTab.value === "tsne" && graphdata === null) {
    content = (
      <>
        <div style={{ display: "flex" }}>
          <div className={styles.infoSection}>
            <p className={styles.moduleTextInfos}>
              &nbsp; &nbsp; &nbsp; &nbsp;
              <span>
                <strong>t-SNE</strong> is a non-linear dimensionality reduction
                technique. It&nbsp;
              </span>
              <span>
                aids in the visual interpretation of GWPS data by transforming
                the high-dimensional expression changes associated with each
                perturbation into a lower-dimensional map. Similar
                perturbations, based on their effects on gene expression, are
                represented by points that are close together on the map. This
                allows for the identification of functionally related genes or
                perturbations and the exploration of genetic networks, as
                perturbations that have similar effects likely target the same
                pathways or biological processes. Thus, t-SNE is a valuable
                approach for probing complex GWPS data, revealing underlying
                patterns and structures that can guide further analysis and
                research.
              </span>
            </p>
            <p className={styles.moduleTextInfos}>
              <strong>To perform t-SNE analysis,</strong> please enter your gene list to the
              perturbation list on the left. Then, click the <strong>"Run Calculation"</strong>
              button. The t-SNE results will be displayed in this panel. For other
              dimensionality reduction methods, you can choose one of the tabs
              above. You can run the calculation multiple times with different
              parameters, or you can run different methods sequentially.
            </p>
          </div>
          <img alt="MDE" src="/images/correlation.png" />
        </div>{" "}
      </>
    );
  } else if (selectedTab.value === "umap" && graphdata === null) {
    content = (
      <>
        <div style={{ display: "flex" }}>
          <div className={styles.infoSection}>
            <p className={styles.moduleTextInfos}>
              <span>
                <strong>
                  &nbsp; &nbsp; &nbsp; &nbsp;Uniform Manifold Approximation and
                  Projection
                </strong>{" "}
                (UMAP) is a dimensionality reduction technique that is
                particularly useful for visualizing high-dimensional datasets in
                a lower-dimensional space, typically 2D or 3D.&nbsp;
              </span>
            </p>
            <p className={styles.moduleTextInfos}>
              <span>
                &nbsp; &nbsp; &nbsp; &nbsp;Both t-SNE and UMAP are effective at
                preserving local structure, meaning that data points that are
                close together in the high-dimensional space will remain close
                in the lower-dimensional representation. However, UMAP generally
                does a better job of preserving the global structure of the
                data, ensuring that data point distance is similar in both high-
                and low-dimensional space. t-SNE tends to prioritize local over
                global relationships, which can sometimes result in misleading
                representations when the goal is to uncover the broader
                relationships in the data.
              </span>
            </p>
            <p className={styles.moduleTextInfos}>
              <strong>To perform UMAP analysis,</strong> please enter your gene list to the
              perturbation list on the left. Then, click the <strong>"Run Calculation"</strong>
              button. The UMAP results will be displayed in this panel. For other
              dimensionality reduction methods, you can choose one of the tabs
              above. You can run the calculation multiple times with different
              parameters, or you can run different methods sequentially.
            </p>
          </div>

          <img alt="UMAP" src="/images/correlation.png" />
        </div>{" "}
      </>
    );
  } else if (selectedTab.value === "mde" && graphdata === null) {
    content = (
      <>
        <div style={{ display: "flex" }}>
          <div className={styles.infoSection}>
            <p className={styles.moduleTextInfos}>
              <strong>
                &nbsp; &nbsp; &nbsp; &nbsp;Minimum Distortion Embedding
              </strong>{" "}
              (MDE) is a nonlinear dimensionality reduction method used in the
              field of data analysis.&nbsp;The "distortion" in MDE refers to the
              discrepancy between distances (or more generally, relationships)
              in the high-dimensional data and the lower-dimensional
              representation. The goal of MDE is to minimize this distortion,
              thereby maintaining a faithful representation of the relationships
              within the data.
            </p>
            <p className={styles.moduleTextInfos}>
              <span>
                <strong>&nbsp; &nbsp; &nbsp; &nbsp;</strong>In our extensive
                benchmarking of various dimensionality reduction (DR)
                algorithms,{" "}
              </span>
              MDE had superior performance at an optimal number of components
              (NOC) of 43, yielding the highest clustering score of 48 and
              identifying up to 15 distinct clusters. However, MDE had
              limitations in handling high NOC values ({">"} 150
              components).&nbsp;
            </p>
            <p className={styles.moduleTextInfos}>
              <strong>&nbsp; &nbsp; &nbsp; &nbsp;</strong>With the aim to
              improve clustering, we combined PCA with the non-linear DR
              algorithms and observed that the combination of PCA and MDE
              provided the best clustering results with increasing scores up to
              an impressive 80. This combination generated up to 23 clusters
              covering almost all genes, with 12 clusters having a score {">"}1.
              It is noteworthy that the computation cost of the PCA-MDE
              combination remained acceptable in comparison to other methods.
              Thus, in light of efficiency, computation time, and quality of
              clustering, PCA-MDE integration appears to be the most efficient
              approach in our tests.
            </p>
            <p className={styles.moduleTextInfos}>
              <strong>To perform MDE analysis,</strong> please enter your gene list to the
              perturbation list on the left. Then, click the <strong>"Run Calculation"</strong>
              button. The MDE results will be displayed in this panel. For other
              dimensionality reduction methods, you can choose one of the tabs
              above. You can run the calculation multiple times with different
              parameters, or you can run different methods sequentially.
            </p>
          </div>
          <img
            style={{ objectFit: "scale-down" }}
            alt="MDE"
            src="/images/correlation.png"
          />
        </div>{" "}
      </>
    );
  } else if (selectedTab.value === "pca") {
    content = (

      <div className={styles.submainView}>
        {pcaResults ? (
          <>
            <div className={styles.infoSection}>
              {" "}
              Total number of principal components: {pcaResults.ratio?.length}
            </div>
            <Row spacing={0} width="100%" height="35vh">
              <ReactEChartsCore
                echarts={echarts}
                option={graphoptions}
                style={{ height: "100%", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </Row>
            <Spacer height="2em" />

            <ScatterPlot graphData={pcaResults} />
          </>
        ) : (
          <div className={styles.infoSection}>
            <p className={styles.moduleTextInfos}>
              <img
                alt="PCA"
                src="/images/PCA.png"
                className={`${styles["float-right"]}`}
              />
              Principal Component Analysis (PCA) aids visualization and
              interpretation of rich datasets by reducing their dimensionality
              with minimal information loss. Given a dataset with an
              N-dimensional space, where N represents the number of variables
              under investigation, PCA summarizes the data by making a linear
              transformation of vectors into a new coordinate system with fewer,
              uncorrelated variables - the Principal Components. These variables
              successively maximize variance from the original matrix and
              graphically simplify the identification of trends, clusters, and
              correlation among the subjects to analysis.
              <br />
              <br />
              <strong>To perform PCA analysis,</strong> please enter your gene list to the
              perturbation list on the left. Then, click the <strong>"Run Calculation"</strong>
              button. The PCA results will be displayed in this panel. For other
              dimensionality reduction methods, you can choose one of the tabs
              above. You can run the calculation multiple times with different
              parameters, or you can run different methods sequentially.

            </p>
          </div>
        )}
         
      </div>
     

    );
  }

  return (
    <div className={styles.mainView}>
      {/* Module Description */}
      <Accordion defaultExpanded={!tsneResults && !umapResults && !mdeResults && !pcaResults}
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
         },
         '& .MuiAccordionSummary-root.Mui-expanded': {
           minHeight: '30px',
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
          }}
        >
          <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>{moduleDescription.title}</h3>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
          <div style={{fontSize: '13px', marginBottom: '0px' }}>
            <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>{moduleDescription.description}</p>
            <h4 style={{ marginBottom: '6px', color: '#424242' }}>Key Features:</h4>
            <ul style={{ marginBottom: '0px', paddingLeft: '20px' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '3px' }}>{feature}</li>
              ))}
            </ul>
          </div>
        </AccordionDetails>
      </Accordion>
      
      {isAnyCalculationRunning && (
        <LoadingPage 
          progressMessage={progressState.message}
          progressPercentage={progressState.percentage}
        />
      )}
      
      {!isAnyCalculationRunning && (
        <>
      {!tsneResults && !umapResults && !mdeResults && !pcaResults && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e3f2fd', 
          borderLeft: '4px solid #1976d2',
          borderRadius: '4px',
          color: '#1565c0',
          marginBottom: '8px',
          fontSize: '13px'
        }}>
          💡 To start, please eneter your gene list to the input box at the left menu, and click the <strong>"Run Calculation"</strong> button.
        </div>
      )}
      {graphdata === null ? (
        <>
          
          <div>
            <h4>
              <span style={{ color: "black" }}>
                <span style={{ color: "#0000ff" }}>
                  <strong>
                    Please choose one of the tabs below to perform DR and
                    Clustering on your gene lists.
                  </strong>
                </span>
              </span>
            </h4>
          </div>
          
        </>
      ) : null}
      <Tabs
        name="Main Tabs"
        value={selectedTab}
        options={options}
        onChange={(evt) => {
          const { value, label } = evt.target;
          setSelectedTab({ value, label });
        }}
      />

      <Spacer />
      {selectedTab.value === "pca" ? (
        <>
        {content}
        <VideoHelpPage videoFile={helpVideo} />
        </>
      ) : selectedTab.value === "precomputed" ? (
        graphdata !== null ? (
          <ScatterPlot graphData={graphdata} />
        ) : (
          <>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              borderLeft: '4px solid #1976d2',
              borderRadius: '4px',
              color: '#1565c0',
              marginBottom: '8px',
              fontSize: '13px'
            }}>
              💡 Select your parameters in the left sidebar and click "Load Pre-computed Data" to view the all-genes DR visualization.
            </div>
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
//{selectedTab.value === "pca"? content : graphdata ? (<ScatterPlot graphData={graphdata} />):<></> }
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
