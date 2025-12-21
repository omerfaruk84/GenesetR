import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { HeatMap } from "../../components/heat-map/index";
import { LoadingPage } from "../../components/loading-page";
import styles from "./heatmap-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/4.webm";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
const moduleDescription = {
  title: "Interactive Heatmap Visualization",
  description: "This module creates heatmaps from the selected perturbation data, allowing you to input lists of genes and perturbations to render gene expression data with customizable clustering on both rows and columns.",
  features: [
    "Customizable clustering parameters for rows and columns",
    "Interactive zoom and pan functionality", 
    "Color scale adjustments and percentile controls",
    "One-click gene list creation from clusters",
    "Integrated gene set enrichment analysis (GSEA)"
  ],  
};
const HeatMapPage = ({ heatmapResults, calcResults }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const heatmapModuleKey = ModulePathNames?.["/heatmap"];
  const isCalculationRunning = calcResults?.[heatmapModuleKey]?.running;
  const progressMessage = calcResults?.[heatmapModuleKey]?.progressMessage ?? null;
  const progressPercentage = calcResults?.[heatmapModuleKey]?.progressPercentage ?? null;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || heatmapResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, heatmapResults]);

  return (
    <div className={styles.mainView}>
      {heatmapResults ? (
        <HeatMap graphData={heatmapResults} />
      ) : isCalculationRunning ? (
        <LoadingPage
          progressMessage={progressMessage || "Generating heatmap..."}
          progressPercentage={progressPercentage}
        />
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
            <AccordionDetails sx={{ padding: '0 14px 5px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>
              <div style={{ fontSize: '13px', color: '#424242' }}>
                <strong>Key Features:</strong>
                <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
                  {moduleDescription.features.map((capability, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>{capability}</li>
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
    💡 To start, please eneter your gene list to the input box at the left menu.
  </div>
          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  heatmapResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  calcResults,
});

const MainContainer = connect(mapStateToProps)(HeatMapPage);
export { MainContainer as HeatMapPage };
