import React, { useMemo, useState, useEffect } from "react";
import { connect } from "react-redux";
import { runCorrCalc } from "../../store/api";
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

// Function to identify genes with significant correlations
const getSignificantGenes = (data, trimThreshold) => {
  // Parse data if it's a string
  const parsedData = safeJsonParse(data, {
    defaultValue: null,
    throwOnError: false
  });
  
  if (!parsedData?.data?.nodes) {
    return null;
  }
  
  const threshold = trimThreshold || 0.1;
  const nodes = parsedData.data.nodes;
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



const CorrelationPage = ({ corrResults, correlationSettings, coreSettings, dispatch, calcResults }) => {
  const [filteredCorrResults, setFilteredCorrResults] = useState(null);
  const [trimStats, setTrimStats] = useState(null);
  const [isFilteringInProgress, setIsFilteringInProgress] = useState(false);

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

  // Effect to handle correlation filtering
  useEffect(() => {
    console.log('useEffect triggered:', { 
      hasCorrResults: !!corrResults, 
      trimEnabled: correlationSettings?.trimEnabled, 
      threshold: correlationSettings?.trimThreshold 
    });
    
    // Parse corrResults if it's a string
    const parsedCorrResults = safeJsonParse(corrResults, {
      defaultValue: null,
      throwOnError: false
    });
    
    if (!parsedCorrResults) {
      setFilteredCorrResults(null);
      setTrimStats(null);
      return;
    }

    // If trimming is not enabled, use original results
    if (!correlationSettings?.trimEnabled) {
      console.log('Trimming disabled, using original results');
      setFilteredCorrResults(parsedCorrResults);
      setTrimStats(null);
      return;
    }

    // Get significant genes for server-side filtering
    const significantGenes = getSignificantGenes(parsedCorrResults, correlationSettings.trimThreshold);
    console.log('Significant genes found:', significantGenes?.length || 0);
    console.log('Original corrResults structure:', {
      hasData: !!parsedCorrResults?.data,
      dataKeys: parsedCorrResults?.data ? Object.keys(parsedCorrResults.data) : 'no data',
      hasNodes: !!parsedCorrResults?.data?.nodes,
      nodesCount: parsedCorrResults?.data?.nodes ? Object.keys(parsedCorrResults.data.nodes).length : 'no nodes',
      hasFeatureNames: !!parsedCorrResults?.data?.feature_names,
      featureNamesCount: parsedCorrResults?.data?.feature_names?.length || 'no feature names'
    });
    
    if (!significantGenes || significantGenes.length < 2) {
      console.warn('Not enough significant genes found, using original data');
      setFilteredCorrResults(parsedCorrResults);
      setTrimStats(null);
      return;
    }

    // Calculate original stats
    const originalRowCount = Object.keys(parsedCorrResults.data.nodes).filter(
      nodeId => parsedCorrResults.data.nodes[nodeId].count === 1
    ).length;
    const originalColCount = parsedCorrResults.data.feature_names?.length || 0;

    // Make server request with proper dataset information
    console.log(`Filtering to ${significantGenes.length} genes from ${originalRowCount} total genes`);
    console.log('Significant genes:', significantGenes.slice(0, 10), '...');
    
    setIsFilteringInProgress(true);
    
    // Create core and corr parameters with proper dataset information
    // Preserve the original targetList behavior - if it was empty, keep it empty
    const originalTargetList = coreSettings?.targetGeneList || "";
    
    console.log('Core settings available:', !!coreSettings, 'Target list:', originalTargetList);
    
    const coreParams = {
      peturbationList: significantGenes.join(';'),
      targetGeneList: originalTargetList, // Keep original target list, don't change it
      dataType: coreSettings?.dataType || "genes",
      cellLine: coreSettings?.cellLine || { id: "" }
    };

    const corrParams = {
      row_distance: correlationSettings?.row_distance || "euclidean",
      column_distance: correlationSettings?.column_distance || "euclidean", 
      row_linkage: correlationSettings?.row_linkage || "average",
      column_linkage: correlationSettings?.column_linkage || "average",
      axis: correlationSettings?.axis || 1,
      normalize: correlationSettings?.normalize || false,
      write_original: correlationSettings?.write_original || false,
      corrType: correlationSettings?.corrType || "spearman"
    };

  
    // Set running state for progress indicator
    dispatch({
      type: 'calcResults/calcRunningChanged',
      payload: { module: 'corrCluster', status: true }
    });

    // Request filtered correlation data from server
    runCorrCalc(coreParams, corrParams)
      .then(response => {
        
        // Parse the response if it's a string
        const parsedResponse = safeJsonParse(response, {
          defaultValue: null,
          throwOnError: false
        });
        
        
        // Check if we got a valid response (runCorrCalc handles task polling)
        if (!parsedResponse) {
          console.warn('No valid response received from server, falling back to original data');
          setFilteredCorrResults(corrResults);
          const stats = {
            originalRows: originalRowCount,
            filteredRows: significantGenes.length,
            removedRows: originalRowCount - significantGenes.length,
            originalCols: originalColCount,
            filteredCols: significantGenes.length,
            removedCols: originalColCount - significantGenes.length
          };
          setTrimStats(stats);
          setIsFilteringInProgress(false);
          return;
        }
        
        const stats = {
          originalRows: originalRowCount,
          filteredRows: significantGenes.length,
          removedRows: originalRowCount - significantGenes.length,
          originalCols: originalColCount,
          filteredCols: significantGenes.length,
          removedCols: originalColCount - significantGenes.length
        };

        setFilteredCorrResults(parsedResponse);
        setTrimStats(stats);
        setIsFilteringInProgress(false);
        
        // Clear running state
        dispatch({
          type: 'calcResults/calcRunningChanged',
          payload: { module: 'corrCluster', status: false }
        });
      })
      .catch(error => {
        console.error('Error fetching filtered correlation data:', error);
        // Fall back to original data on error, but keep the stats to show what would be filtered
        setFilteredCorrResults(parsedCorrResults);
        const stats = {
          originalRows: originalRowCount,
          filteredRows: significantGenes.length,
          removedRows: originalRowCount - significantGenes.length,
          originalCols: originalColCount,
          filteredCols: significantGenes.length,
          removedCols: originalColCount - significantGenes.length
        };
        setTrimStats(stats);
        setIsFilteringInProgress(false);
        
        // Clear running state on error
        dispatch({
          type: 'calcResults/calcRunningChanged',
          payload: { module: 'corrCluster', status: false }
        });
      });
    
  }, [corrResults, correlationSettings?.trimEnabled, correlationSettings?.trimThreshold]);

  // Check if correlation calculation is running
  const isCalculationRunning = calcResults?.["corrCluster"]?.running;
  const progressMessage = calcResults?.["corrCluster"]?.progressMessage;
  const progressPercentage = calcResults?.["corrCluster"]?.progressPercentage;

  return (
    <div className={styles.mainView}>
      {/* Module Description */}
      <Accordion defaultExpanded
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
              💡 To start, please add genes to the input list from the left menu and click "Run Calculation" to generate correlation map.
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
            
            const dataToRender = filteredCorrResults || parsedCorrResults;
            const hasNodes = !!dataToRender?.data?.nodes;
            const hasFeatureNames = !!dataToRender?.data?.feature_names;
            const isValid = hasNodes && hasFeatureNames;
            
            console.log('Rendering HeatMap with data:', 
              'useFiltered:', !!filteredCorrResults,
              'isValid:', isValid,
              'hasNodes:', hasNodes,
              'hasFeatureNames:', hasFeatureNames,
              'filteredNodes:', filteredCorrResults?.data?.nodes ? Object.keys(filteredCorrResults.data.nodes).length : 'N/A',
              'originalNodes:', parsedCorrResults?.data?.nodes ? Object.keys(parsedCorrResults.data.nodes).length : 'N/A'
            );
            
            return isValid ? (
              <HeatMap graphData={dataToRender} showDescription={false} />
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
