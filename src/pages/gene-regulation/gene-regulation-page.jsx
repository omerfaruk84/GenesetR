import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { GeneRegulation } from "./generegulation";
import styles from "./gene-regulation-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/3.webm";
import { ModuleIntro, Notice } from "../../components/ui";
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const moduleKey = ModulePathNames?.[path] ?? "geneRegulationGraph";
  const moduleState = calcResults?.[moduleKey] ?? {};
  const {
    running: isCalculationRunning,
    progressMessage,
    progressPercentage,
  } = moduleState;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || geneRegulationResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, geneRegulationResults]);

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
      {geneRegulationResults ? (
        <GeneRegulation blacklistData={blacklistData} blacklistLoading={blacklistLoading} />
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
            To start, select a dataset from the left sidebar, then choose a gene from the gene regulation settings.
          </Notice>
          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )}
      </>
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
