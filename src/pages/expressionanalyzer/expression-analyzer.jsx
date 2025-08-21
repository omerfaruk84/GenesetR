import React from "react";
import { connect } from "react-redux";
import {
  Row,
  Column,
  Spacer,
  Heading,
} from "@oliasoft-open-source/react-ui-library";
import { ExpressionAnalyzer } from "../../components/expressionanalyzer/expressionanalyzer";
import styles from "./expression-analyzer.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import VideoHelpPage from "../../components/video-help";
import helpVideo from "../../common/videos/6.webm";

const ExpressionAnalyzerPage = ({ geneRegulationResults, blacklistData, blacklistLoading }) => {

  return (
    <div className={styles.mainView}>
      <ExpressionAnalyzer data={geneRegulationResults} blacklistData={blacklistData} blacklistLoading={blacklistLoading} />
      {/*geneRegulationResults.geneRegulationResults !== null ? (
        <ExpressionAnalyzer data={geneRegulationResults} />
      ) : (
        <div>
          <VideoHelpPage videoFile={helpVideo} />
        </div>
      )*/}
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
