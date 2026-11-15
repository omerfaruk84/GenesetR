import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { HeatMap } from "../../components/heat-map/index";
import { LoadingPage } from "../../components/loading-page";
import styles from "./heatmap-page.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/4.webm";
import { ModuleIntro, Notice } from "../../components/ui";

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
      {isCalculationRunning ? (
        <LoadingPage
          progressMessage={progressMessage || "Generating heatmap..."}
          progressPercentage={progressPercentage}
        />
      ) : heatmapResults ? (
        <HeatMap graphData={heatmapResults} />
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
            To start, enter your gene list in the input box of the left menu.
          </Notice>
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
