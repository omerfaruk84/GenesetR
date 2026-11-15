import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { DeregulatedGenes } from '../../components/deregulated-genes/deregulated-genes';
import styles from './deregulated-genes-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import { ModuleIntro, Notice } from '../../components/ui';
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
            <ModuleIntro
              title={moduleDescription.title}
              description={moduleDescription.description}
              expanded={isDescriptionExpanded}
              onChange={setIsDescriptionExpanded}
            />
            <Notice kind="info">
              Select a dataset in the left sidebar, enter one or more perturbations and run the analysis.
            </Notice>
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
