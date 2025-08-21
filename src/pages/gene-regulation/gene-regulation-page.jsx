import React from "react";
import { connect } from "react-redux";
import { Row, Column } from "@oliasoft-open-source/react-ui-library";
import { GeneRegulation } from "./generegulation";
import styles from "./gene-regulation-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/3.webm";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from "../../components/loading-page";

const moduleDescription = {
  title: "Gene Regulation Network Analysis",
  description: "This module identifies and visualizes upstream and downstream regulators of a gene of interest (GOI) by constructing regulatory networks based on gene expression neighbors. The network reveals how genes regulate each other and helps understand the functional relationships within cellular pathways.",
  features: [
    "Upstream Regulators (UPR/UNR): Identify genes whose perturbations regulate the GOI",
    "Downstream Targets (DPR/DNR): Find genes that are regulated following GOI knockdown",
    "Network visualization with interactive node positioning and filtering", 
    "Neighbor count analysis showing strength/reliability of gene interactions", 
    "Logical link discovery among upstream regulators and downstream targets"
  ],
 
};

const GeneRegulationPage = ({ geneRegulationResults, calcResults, path, blacklistData, blacklistLoading }) => {

  // Check if gene regulation calculation is running
  const isCalculationRunning = calcResults?.["geneRegulationGraph"]?.running;

  return (
    <div className={styles.mainView}>
      {isCalculationRunning && <LoadingPage />}
      {geneRegulationResults ? (
        <GeneRegulation blacklistData={blacklistData} blacklistLoading={blacklistLoading} />
      ) : (
        <div>
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
            <ul style={{ marginBottom: '0px', paddingLeft: '20px' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '3px' }}>{feature}</li>
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
    💡 To start, please select a gene from the left menu.
  </div>

          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults, blacklist }, { path }) => ({
  calcResults,
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  blacklistData: blacklist?.data,
  blacklistLoading: blacklist?.loading,
  path,
});

const MainContainer = connect(mapStateToProps)(GeneRegulationPage);
export { MainContainer as GeneRegulationPage };
