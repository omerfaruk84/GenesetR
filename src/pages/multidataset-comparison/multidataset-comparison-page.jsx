import React from "react";
import { connect } from "react-redux";
import { MultiDatasetComparison } from "../../components/multidataset-comparison/multidataset-comparison";
import styles from "./multidataset-comparison-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/6.webm";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from "../../components/loading-page";

const moduleDescription = {
  title: "Multi-Dataset Comparison",
  description: "This module compares expression and perturbation data for a selected gene across all whole genome perturbation datasets. It provides comprehensive analysis by combining results from K562, HCT116, and HEK293 datasets to identify consistent patterns and differences.",
  features: [
    "Compare gene expression patterns across multiple cell lines",
    "Analyze perturbation effects in different cellular contexts", 
    "View both upstream regulators and downstream targets",
    "Correlation analysis across datasets",
    "Average values and consistency metrics",
    "Side-by-side dataset comparison tables"
  ],
};

const MultiDatasetComparisonPage = ({ 
  multiDatasetResults, 
  calcResults, 
  path 
}) => {
  // Check if calculation is running
  const isCalculationRunning = calcResults?.["multiDatasetComparison"]?.running;
  const progressMessage = calcResults?.["multiDatasetComparison"]?.progressMessage;
  const progressPercentage = calcResults?.["multiDatasetComparison"]?.progressPercentage;

  return (
    <div className={styles.mainView}>
      {isCalculationRunning && (
        <LoadingPage 
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}
      {!isCalculationRunning && (
      <>
      {multiDatasetResults ? (
        <MultiDatasetComparison data={multiDatasetResults} />
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
            💡 To start, select a gene from the left sidebar and click "Run Multi-Dataset Analysis".
          </div>

          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )}
      </>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  calcResults,
  multiDatasetResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  path,
});

const MainContainer = connect(mapStateToProps)(MultiDatasetComparisonPage);
export { MainContainer as MultiDatasetComparisonPage }; 