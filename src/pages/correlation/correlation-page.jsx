import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { runCorrCalc, runCorrCalcMultiDataset } from "../../store/api";
import { safeJsonParse } from "../../utils/jsonUtils";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "../../components/side-bar/settings/enums";

import { HeatMap } from "../../components/heat-map/index";
import styles from "./correlation-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/1.webm";
import corrhelpVideo from "../../common/videos/Correlation.mp4";
import { EmptyState, ModuleIntro, Notice } from "../../components/ui";
import { LoadingPage } from "../../components/loading-page";


// Add module description for Correlation Analysis
const moduleDescription = {
  title: "Correlation Module",
  description: "This module creates correlation heatmaps based on perturbation or gene expression data. Analysis can be performed on the entire dataset or limited to specific pathways or gene families by submitting a gene list to focus the correlation calculation.",
  features: [
    "Pearson, Spearman, and Kendall correlation methods available",
    "Analysis on entire dataset or subset based on submitted gene lists",
    "Hierarchical clustering on both rows and columns with different distance metrics",
    "Gene and perturbation clusters displayed as rectangular blocks along diagonal",
    "Zoom functionality and ability to create gene lists from clusters with one click"
  ]
};

// Single-dataset results are the heatmap itself; multi-dataset results wrap the
// combined heatmap in `combined_data`.
const getHeatmapPayload = (parsed) =>
  parsed?.combined_data?.data ? parsed.combined_data : parsed;

// Function to identify genes with significant correlations
const getSignificantGenes =  (data, trimThreshold) => {
  // Parse data if it's a string
  const parsedData = safeJsonParse(data, {
    defaultValue: null,
    throwOnError: false
  });
  
  const heatmap = getHeatmapPayload(parsedData);
  if (!heatmap?.data?.nodes) {
    return null;
  }

  const threshold = trimThreshold || 0.1;
  const nodes = heatmap.data.nodes;
  const significantGenes = new Set();
  
  // Find genes with at least one significant correlation
  Object.keys(nodes).forEach(nodeId => {
    const node = nodes[nodeId];
    if (node.count === 1) {
      const geneName = node.objects[0];
      let hasSignificantCorr = false;
      
      node.features.forEach((value) => {
        if (value !== null && value !== 1 && value !== -1 && Math.abs(value) >= threshold) {
          hasSignificantCorr = true;
        }
      });
      
      if (hasSignificantCorr) {
        significantGenes.add(geneName);
      }
    }
  });
  
    return Array.from(significantGenes);
};



const CorrelationPage = ({
  corrResults,
  correlationSettings,
  coreSettings,
  dispatch,
  calcResults,
}) => {
  const [filteredCorrResults, setFilteredCorrResults] = useState(null);
  const [trimStats, setTrimStats] = useState(null);
  const [isFilteringInProgress, setIsFilteringInProgress] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Effect to load pending gene list from localStorage (when opened from enrichment table)
  useEffect(() => {
    // Add a small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      const pendingDataKey = `pendingGeneList_/correlation`;
      const pendingData = localStorage.getItem(pendingDataKey);
      
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData);
          // Check if data is recent (within last 30 seconds) to avoid stale data
          if (Date.now() - data.timestamp < 30000) {
            console.log('Loading gene list from localStorage:', data);
          // If dataType is "pert", clear target list to avoid confusion
          // If dataType is "genes", clear perturbation list to avoid confusion
          if (data.dataType === "pert") {
            // Clear target gene list when setting perturbation list
            dispatch(coreSettingsChanged({
              settingName: CoreSettingsTypes.TARGET_LIST,
              newValue: "",
            }));
          } else if (data.dataType === "genes") {
            // Clear perturbation list when setting target gene list
            dispatch(coreSettingsChanged({
              settingName: CoreSettingsTypes.PETURBATION_LIST,
              newValue: "",
            }));
          }
          
          // Set the gene list in Redux
          dispatch(coreSettingsChanged({
            settingName: data.settingName,
            newValue: data.value,
          }));
          
          // If dataType is provided, set it too
          if (data.dataType) {
            dispatch(coreSettingsChanged({
              settingName: CoreSettingsTypes.DATA_TYPE,
              newValue: data.dataType,
            }));
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
  }, [dispatch]);

  // Inputs the displayed result was calculated with (stored with the result)
  const resultRequestParams = calcResults?.["corrCluster"]?.requestParams;
  const trimRequestIdRef = useRef(0); // identifies the latest trim request
  const trimInFlightRef = useRef(false);

  // Effect to handle correlation filtering ("Trim Low Correlations")
  useEffect(() => {
    // Any trim request that is still running belongs to older inputs: its
    // response must not be shown any more.
    const requestId = ++trimRequestIdRef.current;

    const stopPendingTrim = () => {
      setIsFilteringInProgress(false);
      if (trimInFlightRef.current) {
        trimInFlightRef.current = false;
        dispatch({
          type: 'calcResults/calcRunningChanged',
          payload: { module: 'corrCluster', status: false }
        });
      }
    };

    // Parse corrResults if it's a string
    const parsedCorrResults = safeJsonParse(corrResults, {
      defaultValue: null,
      throwOnError: false
    });

    if (!parsedCorrResults) {
      setFilteredCorrResults(null);
      setTrimStats(null);
      stopPendingTrim();
      return;
    }

    // If trimming is not enabled, use original results
    if (!correlationSettings?.trimEnabled) {
      setFilteredCorrResults(parsedCorrResults);
      setTrimStats(null);
      stopPendingTrim();
      return;
    }

    // Get significant genes for server-side filtering
    const significantGenes = getSignificantGenes(parsedCorrResults, correlationSettings.trimThreshold);

    if (!significantGenes || significantGenes.length < 2) {
      console.warn('Not enough significant genes found, using original data');
      setFilteredCorrResults(parsedCorrResults);
      setTrimStats(null);
      stopPendingTrim();
      return;
    }

    // Calculate original stats
    const heatmap = getHeatmapPayload(parsedCorrResults);
    const originalRowCount = Object.keys(heatmap.data.nodes).filter(
      nodeId => heatmap.data.nodes[nodeId].count === 1
    ).length;
    const originalColCount = heatmap.data.feature_names?.length || 0;
    const stats = {
      originalRows: originalRowCount,
      filteredRows: significantGenes.length,
      removedRows: originalRowCount - significantGenes.length,
      originalCols: originalColCount,
      filteredCols: significantGenes.length,
      removedCols: originalColCount - significantGenes.length
    };

    // Recalculate with exactly the inputs of the displayed result (dataset(s),
    // data type, gene subset, clustering options) - not with whatever the
    // sidebar shows now. Only the perturbation list is replaced.
    const usedCore = resultRequestParams?.core || coreSettings || {};
    const usedCorr = resultRequestParams?.correlation || correlationSettings || {};
    const usedDatasets = resultRequestParams?.datasets || correlationSettings?.selectedDatasets || [];
    const isMultiDatasetResult =
      !!parsedCorrResults?.combined_data && usedDatasets.length > 1;

    const coreParams = {
      peturbationList: significantGenes.join(';'),
      targetGeneList: usedCore.targetGeneList || "",
      dataType: usedCore.dataType || "genes",
      cellLine: usedCore.cellLine || { id: "" },
      selectedDatasets: usedDatasets,
    };

    const corrParams = {
      row_distance: usedCorr.row_distance || "euclidean",
      column_distance: usedCorr.column_distance || "euclidean",
      row_linkage: usedCorr.row_linkage || "average",
      column_linkage: usedCorr.column_linkage || "average",
      axis: usedCorr.axis || "both",
      normalize: usedCorr.normalize || false,
      write_original: usedCorr.write_original || false,
      corrType: usedCorr.corrType || "spearman",
      combineMethod: usedCorr.combineMethod || "average",
    };

    setIsFilteringInProgress(true);
    trimInFlightRef.current = true;

    // Set running state for progress indicator. The request itself is not
    // tracked by the store (disableModuleTracking), so a superseded request can
    // never switch the running state back on.
    dispatch({
      type: 'calcResults/calcRunningChanged',
      payload: { module: 'corrCluster', status: true }
    });

    const requestOptions = { disableModuleTracking: true };
    const request = isMultiDatasetResult
      ? runCorrCalcMultiDataset(coreParams, corrParams, requestOptions)
      : runCorrCalc(coreParams, corrParams, requestOptions);

    request
      .then(response => {
        if (requestId !== trimRequestIdRef.current) return; // superseded

        const parsedResponse = safeJsonParse(response, {
          defaultValue: null,
          throwOnError: false
        });

        if (!parsedResponse) {
          console.warn('No valid response received from server, falling back to original data');
        }
        // Fall back to the original data when the response is unusable; the
        // stats still show what would have been filtered.
        setFilteredCorrResults(parsedResponse || parsedCorrResults);
        setTrimStats(stats);
      })
      .catch(error => {
        if (requestId !== trimRequestIdRef.current) return; // superseded
        console.error('Error fetching filtered correlation data:', error);
        setFilteredCorrResults(parsedCorrResults);
        setTrimStats(stats);
      })
      .finally(() => {
        if (requestId !== trimRequestIdRef.current) return; // superseded
        // Always leave the loading state, whatever the outcome was
        trimInFlightRef.current = false;
        setIsFilteringInProgress(false);
        dispatch({
          type: 'calcResults/calcRunningChanged',
          payload: { module: 'corrCluster', status: false }
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corrResults, correlationSettings?.trimEnabled, correlationSettings?.trimThreshold]);

  // Check if correlation calculation is running
  const isCalculationRunning = calcResults?.["corrCluster"]?.running;
  const progressMessage = calcResults?.["corrCluster"]?.progressMessage;
  const progressPercentage = calcResults?.["corrCluster"]?.progressPercentage;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || corrResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, corrResults]);

  return (
    <div className={styles.mainView}>
      {/* Module Description */}
      <ModuleIntro
        title={moduleDescription.title}
        description={moduleDescription.description}
        features={moduleDescription.features}
        expanded={isDescriptionExpanded}
        onChange={setIsDescriptionExpanded}
      >
        {!corrResults && (
          <Notice kind="info" style={{ margin: "12px 0 0" }}>
            To start, add genes to the input list in the left menu, select at least one dataset and click
            "Calculate Correlation" to generate the correlation map.
          </Notice>
        )}
      </ModuleIntro>

      {corrResults && correlationSettings?.trimEnabled && isFilteringInProgress && (
        <Notice kind="warning" title="Filtering in progress.">
          Recalculating the correlation matrix for the significant genes.
        </Notice>
      )}

      {corrResults && correlationSettings?.trimEnabled && trimStats && !isFilteringInProgress && (
        filteredCorrResults !== corrResults ? (
          <Notice kind="info" title="Trimming active.">
            Showing genes with correlations ≥ {correlationSettings.trimThreshold} (excluding ±1 values):{" "}
            {trimStats.filteredRows} of {trimStats.originalRows} genes, displayed as a {trimStats.filteredRows} ×{" "}
            {trimStats.filteredCols} matrix.
          </Notice>
        ) : (
          <Notice kind="warning" title="Filtering failed.">
            The server request failed. Trimming would keep {trimStats.filteredRows} of {trimStats.originalRows} genes
            with correlations ≥ {correlationSettings.trimThreshold} ({trimStats.filteredRows} ×{" "}
            {trimStats.filteredCols} matrix); the original {trimStats.originalRows} × {trimStats.originalCols} matrix
            is shown.
          </Notice>
        )
      )}

      {isCalculationRunning && (
        <LoadingPage 
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}
      
      {!isCalculationRunning && (
        <>
      {isFilteringInProgress ? (
        <EmptyState title="Filtering correlation data…" />
      ) : (filteredCorrResults || corrResults) ? (
        <>
          {(() => {
            // Parse corrResults if it's a string for rendering
            const parsedCorrResults = safeJsonParse(corrResults, {
              defaultValue: null,
              throwOnError: false
            });
            
            // Determine which data source to use
            const dataSource = filteredCorrResults || parsedCorrResults;
            
            // Check if this is multi-dataset result structure (check both filtered and original)
            const isMultiDataset = dataSource?.combined_data || dataSource?.dataset_scores;
            
            let dataToRender = dataSource;
            let datasetScores = null;
            let datasets = null;
            
            if (isMultiDataset) {
              // Multi-dataset mode: extract combined_data for heatmap
              dataToRender = dataSource.combined_data || dataSource;
              datasetScores = dataSource.dataset_scores || null;
              datasets = dataSource.datasets || null;
            }
            
            const hasNodes = !!dataToRender?.data?.nodes;
            const hasFeatureNames = !!dataToRender?.data?.feature_names;
            const isValid = hasNodes && hasFeatureNames;
            
            console.log('Rendering HeatMap with data:', 
              'useFiltered:', !!filteredCorrResults,
              'isMultiDataset:', isMultiDataset,
              'isValid:', isValid,
              'hasNodes:', hasNodes,
              'hasFeatureNames:', hasFeatureNames,
              'filteredNodes:', filteredCorrResults?.data?.nodes ? Object.keys(filteredCorrResults.data.nodes).length : 'N/A',
              'originalNodes:', parsedCorrResults?.data?.nodes ? Object.keys(parsedCorrResults.data.nodes).length : 'N/A'
            );
            
            return isValid ? (
              <HeatMap 
                graphData={dataToRender} 
                showDescription={false}
                datasetScores={datasetScores}
                datasets={datasets}
                isMultiDataset={isMultiDataset}
              />
            ) : (
              <Notice kind="danger" title="Invalid data structure: the heatmap cannot be drawn.">
                Missing: {!hasNodes ? 'nodes ' : ''}{!hasFeatureNames ? 'feature_names' : ''}. Data type:{" "}
                {typeof dataToRender}. Has data: {String(!!dataToRender?.data)}.
              </Notice>
            );
          })()}
        </>
      ) : (
        <div>
          <VideoHelpPage videoFile={helpVideo} />

          <h2 className={styles.videoTitle}>Demonstration video</h2>

          <div className={styles.newvideo}>
            <video
              //ref={corrhelpVideo}
              //onClick={handlePlayPause}
              width="100%"
              style={{
                objectPosition: "left top",
                objectFit: "cover",
              }}
              preload="auto"
              
              playsInline
              controls
            >
              <source src={corrhelpVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults, settings }, { path }) => ({
  calcResults,
  corrResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  correlationSettings: settings?.correlation ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CorrelationPage);
export { MainContainer as CorrelationPage };
