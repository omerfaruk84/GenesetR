import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { PathFinder } from '../../components/pathfinder';
import { ModulePathNames } from '../../store/results/enums';
import styles from './pathfinder-page.module.scss';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/5.webm';
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from '../../components/loading-page';
import { fetchBlacklistData } from '../../store/blacklist';
import { coreSettingsChanged } from '../../store/settings/core-settings';
import { CoreSettingsTypes } from '../../components/side-bar/settings/enums';

const moduleDescription = {
  title: "Pathway Explorer",
  description: "This module maps pathways among submitted genes using GWPS data, particularly useful for RNA-seq data analyses. It examines down-regulated genes to determine which genes are up- or down-regulated following perturbation, creating pathway networks that reveal key regulatory relationships and interactions.",
  description2: "Interactive network shows regulatory relationships. Node sizes reflect the number of interaction partners (neighbours), node opacity shows knockdown efficiency, and edge width/color indicate effect strength (e.g a green arrow from gene A to gene B indicates that knockdown of gene A leads to down-regulation of gene B).",
  features: [
    "Maps regulatory pathways between submitted genes",
    "Identifies key nodes that mediate observed phenotypes", 
    "Visualizes gene-gene interactions with effect sizes",
    "Integrates correlation data from GWPS",
    "Integrates protein-protein interaction data from BioGRID"
  ],  
};
const PathFinderPage = ({ pathfinderResults, calcResults, blacklistData, blacklistLoading, pathfinderSettings, dispatch, coreSettingsChanged: setCoreSettings }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Check if pathfinder calculation is running
  const isCalculationRunning = calcResults?.["pathFinderGraph"]?.running;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || pathfinderResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, pathfinderResults]);

  // Effect to load pending gene list from localStorage (when opened from enrichment table)
  useEffect(() => {
    // Add a small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      const pendingDataKey = `pendingGeneList_/pathfinder`;
      const pendingData = localStorage.getItem(pendingDataKey);
      
      if (pendingData) {
        try {
          const data = JSON.parse(pendingData);
          // Check if data is recent (within last 30 seconds) to avoid stale data
          if (Date.now() - data.timestamp < 30000) {
            console.log('Loading gene list from localStorage:', data);
            
            // For Path Explorer, we're setting downregulated genes (perturbation list)
            // Don't clear the upregulated genes list (target list) since both should be visible
            // Set the gene list in Redux
            setCoreSettings({
              settingName: data.settingName,
              newValue: data.value,
            });
            
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
  }, [setCoreSettings]);

  // Fetch blacklist data if not already loaded
  useEffect(() => {
    if (!blacklistData || Object.keys(blacklistData).length === 0) {
      dispatch(fetchBlacklistData());
    }
  }, [blacklistData, dispatch]);

  const progressMessage = calcResults?.["pathFinderGraph"]?.progressMessage;
  const progressPercentage = calcResults?.["pathFinderGraph"]?.progressPercentage;

  return (
    <div className={styles.mainView}>
      {(isCalculationRunning || blacklistLoading) && (
        <LoadingPage 
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}

      {!(isCalculationRunning || blacklistLoading) && (
      <>
      {pathfinderResults ? (
        <PathFinder pathFinderGraph={pathfinderResults} blacklistData={blacklistData} pathfinderSettings={pathfinderSettings} /> 
      ) : (
        <div>  
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
        <AccordionDetails sx={{ padding: '6px 14px 5px' }}>
          <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
            {moduleDescription.description}
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
            {moduleDescription.description2}
          </p>
          <div style={{ fontSize: '13px', color: '#424242' }}>
            <strong>Key Features:</strong>
            <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '2px' }}>{feature}</li>
              ))}
            </ul>
          </div>
        </AccordionDetails>
      </Accordion>
       <div style={{ 
    padding: '12px', 
    backgroundColor: '#e3f2fd', 
    borderLeft: '4px solid #1976d2',
    borderRadius: '4px',
    color: '#1565c0',
    marginBottom: '8px'
  }}>
    Tip: Select a dataset from the left sidebar, then enter your gene list in the perturbations field to begin.
  </div>
       
        <VideoHelpPage videoFile={helpVideo}/>
        </div>

      )}
      </>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults, blacklist, settings }, { path }) => ({
  calcResults,
  pathfinderResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  blacklistData: blacklist?.data,
  blacklistLoading: blacklist?.loading,
  pathfinderSettings: settings?.pathfinder ?? {},
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
  coreSettingsChanged: (payload) => dispatch(coreSettingsChanged(payload)),
});

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PathFinderPage);
export { MainContainer as PathFinderPage };
