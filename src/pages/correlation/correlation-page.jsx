import React from "react";
import { connect } from "react-redux";

import { HeatMap } from "../../components/heat-map/index";
import styles from "./correlation-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/1.webm";
import corrhelpVideo from "../../common/videos/Correlation.mp4";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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

const CorrelationPage = ({ corrResults }) => {
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

      {corrResults ? (
        <HeatMap graphData={corrResults} showDescription={false} />
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
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  corrResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(CorrelationPage);
export { MainContainer as CorrelationPage };
