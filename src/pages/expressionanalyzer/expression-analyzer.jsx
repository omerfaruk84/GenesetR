import React from "react";
import { connect } from "react-redux";
import { ExpressionAnalyzer } from "../../components/expressionanalyzer/expressionanalyzer";
import styles from "./expression-analyzer.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/6.webm";

const ExpressionAnalyzerPage = ({ geneRegulationResults, blacklistData, blacklistLoading }) => {
  const hasResults = Boolean(geneRegulationResults);
  return (
    <div className={styles.mainView}>
      {hasResults ? (
        <ExpressionAnalyzer
          data={geneRegulationResults}
          blacklistData={blacklistData}
          blacklistLoading={blacklistLoading}
        />
      ) : (
        <VideoHelpPage videoFile={helpVideo} />
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults, blacklist }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  blacklistData: blacklist?.data,
  blacklistLoading: blacklist?.loading,
});
const mapDispatchToProps = {};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpressionAnalyzerPage);
export { MainContainer as ExpressionAnalyzerPage };
