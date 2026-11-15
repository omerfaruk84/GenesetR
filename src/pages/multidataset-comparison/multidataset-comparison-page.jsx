import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { MultiDatasetComparison } from "../../components/multidataset-comparison/multidataset-comparison";
import styles from "./multidataset-comparison-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import { ModuleIntro, Notice } from "../../components/ui";
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Check if calculation is running
  const isCalculationRunning = calcResults?.["multiDatasetComparison"]?.running;
  const progressMessage = calcResults?.["multiDatasetComparison"]?.progressMessage;
  const progressPercentage = calcResults?.["multiDatasetComparison"]?.progressPercentage;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || multiDatasetResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, multiDatasetResults]);

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
          <ModuleIntro
            title={moduleDescription.title}
            description={moduleDescription.description}
            features={moduleDescription.features}
            expanded={isDescriptionExpanded}
            onChange={setIsDescriptionExpanded}
          />

          <Notice kind="info">
            To start, select a gene from the left sidebar and click "Compare Datasets".
          </Notice>
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