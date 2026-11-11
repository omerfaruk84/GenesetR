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
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  inchlibConstructor,
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
      <Accordion 
        expanded={isDescriptionExpanded}
        onChange={(event, expanded) => setIsDescriptionExpanded(expanded)}
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
        <AccordionDetails sx={{ backgroundColor: '#fafafa', padding: '16px' }}>
          <div style={{ marginBottom: '0px' }}>
            <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>{moduleDescription.description}</p>
            <h4 style={{ marginBottom: '6px', color: '#424242' }}>Key Features:</h4>
            <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '3px' }}>{feature}</li>
              ))}
            </ul>
            {!corrResults && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              borderLeft: '4px solid #1976d2',
              borderRadius: '4px',
              color: '#1565c0'
            }}>
              💡 To start, please add genes to the input list from the left menu select at least one dataset and click "Calculate Correlation" to generate the correlation map.
            </div>
            )}
           
          </div>
        </AccordionDetails>
      </Accordion>
 {corrResults && correlationSettings?.trimEnabled && isFilteringInProgress && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#fff3cd', 
              borderLeft: '4px solid #ffc107',
              borderRadius: '4px',
              color: '#856404',
              marginTop: '10px',
              fontSize: '14px'
            }}>
              ⏳ <strong>Filtering in progress...</strong> Recalculating correlation matrix for significant genes.
            </div>
            )}
            
            {corrResults && correlationSettings?.trimEnabled && trimStats && !isFilteringInProgress && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: filteredCorrResults !== corrResults ? '#e8f4f8' : '#fff3cd', 
              borderLeft: filteredCorrResults !== corrResults ? '4px solid #17a2b8' : '4px solid #ffc107',
              borderRadius: '4px',
              color: filteredCorrResults !== corrResults ? '#0c5460' : '#856404',
              marginTop: '10px',
              fontSize: '14px'
            }}>
              {filteredCorrResults !== corrResults ? (
                <>
                  ✂️ <strong>Trimming Active:</strong> Showing genes with correlations ≥ {correlationSettings.trimThreshold} (excluding ±1 values).
                  <br />
                  📊 <strong>Filtered:</strong> {trimStats.filteredRows} genes (from {trimStats.originalRows} total), displaying {trimStats.filteredRows} × {trimStats.filteredCols} matrix
                </>
              ) : (
                <>
                  ⚠️ <strong>Filtering Failed:</strong> Server request failed, but would filter to {trimStats.filteredRows} genes (from {trimStats.originalRows} total) with correlations ≥ {correlationSettings.trimThreshold}.
                  <br />
                  📊 <strong>Would Show:</strong> {trimStats.filteredRows} × {trimStats.filteredCols} matrix (currently showing original {trimStats.originalRows} × {trimStats.originalCols})
                </>
              )}
            </div>
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
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '16px' }}>
          ⏳ Filtering correlation data...
        </div>
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
                inchlibConstructor={inchlibConstructor}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                ⚠️ Invalid data structure - cannot render heatmap
                <br />
                <small>
                  Missing: {!hasNodes ? 'nodes ' : ''}{!hasFeatureNames ? 'feature_names' : ''}
                  <br />
                  Data type: {typeof dataToRender}
                  <br />
                  Has data: {!!dataToRender?.data}
                </small>
              </div>
            );
          })()}
        </>
      ) : (
        <div>
          <VideoHelpPage videoFile={helpVideo} />

          <h1 style={{ marginTop: "40px", textAlign: "center" }}>
            New demonstration video
          </h1>

          <div className={styles.newvideo}>
            <video
              //ref={corrhelpVideo}
              //onClick={handlePlayPause}
              width="100%"
              style={{
                objectPosition: "left top",
                objectFit: "cover",
                backgroundColor: "#fff",
              }}
              preload="auto"
              
              playsinline
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
