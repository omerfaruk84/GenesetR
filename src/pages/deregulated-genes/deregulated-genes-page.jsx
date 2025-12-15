import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { DeregulatedGenes } from '../../components/deregulated-genes/deregulated-genes';
import styles from './deregulated-genes-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from '../../components/loading-page';

const moduleDescription = {
  title: "Deregulated Genes Analysis",
  description: "This module identifies genes commonly deregulated across your selected perturbations. It reports Perturbation Count (how many perturbations a gene appears in), Frequency (that count as a % of all selected perturbations), Direction (more often up or down), and Avg Z-Score/Rank across appearances. Select multiple datasets in the sidebar to also compute a multi-dataset aggregate.",
  tabs: {
    table: "Table showing commonly deregulated genes across selected perturbations with their average z-scores and frequency of appearance.",
    heatmap: "Heatmap visualization of gene expression across perturbations, showing patterns of co-regulation."
  }
};

const DeregulatedGenesPage = ({
  deregulatedGenesResults,
  deregulatedGenesMultiDatasetResults,
  calcResults,
  path
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Check if any calculation is running
  const isMainCalculationRunning = calcResults?.[ModulePathNames?.[path]]?.running;
  const isMultiDatasetRunning = calcResults?.["deregulatedGenesMultiDataset"]?.running;
  const isAnyCalculationRunning = isMainCalculationRunning || isMultiDatasetRunning;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isAnyCalculationRunning || deregulatedGenesResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isAnyCalculationRunning, deregulatedGenesResults]);

  // Get progress state from the currently running calculation
  const getProgressState = () => {
    if (isMultiDatasetRunning) {
      return {
        message: calcResults["deregulatedGenesMultiDataset"].progressMessage,
        percentage: calcResults["deregulatedGenesMultiDataset"].progressPercentage,
      };
    } else if (isMainCalculationRunning) {
      const moduleName = ModulePathNames?.[path];
      return {
        message: calcResults[moduleName]?.progressMessage,
        percentage: calcResults[moduleName]?.progressPercentage,
      };
    }
    return { message: null, percentage: null };
  };

  const progressState = getProgressState();

  return (
    <div className={styles.mainView}>
      {isAnyCalculationRunning && (
        <LoadingPage
          progressMessage={progressState.message}
          progressPercentage={progressState.percentage}
        />
      )}
      {!isAnyCalculationRunning && (
      <>
      {deregulatedGenesResults ? (
          <DeregulatedGenes
            data={deregulatedGenesResults}
            multiDatasetData={deregulatedGenesMultiDatasetResults}
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
    }}}>
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
            <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
              <p style={{ margin: '0 0 0px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>
            </AccordionDetails>
          </Accordion>
            </div>
          )}
      </>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  deregulatedGenesResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  deregulatedGenesMultiDatasetResults: calcResults?.deregulatedGenesMultiDataset?.result ?? null,
  calcResults,
  path,
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(DeregulatedGenesPage);
export { MainContainer as DeregulatedGenesPage };
