import React, { useState, useEffect } from "react";
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
import { getBlackList } from "../../store/api";

const ExpressionAnalyzerPage = (geneRegulationResults) => {
  const [blacklistData, setBlacklistData] = useState(null);
  const [blacklistLoading, setBlacklistLoading] = useState(true);

  // Load blacklist data immediately when the page loads
  useEffect(() => {
    getBlackList().then((result) => {
      const genesUp = {};
      const genesDown = {};

      for (const gene in result.blacklist.ZS) {
        if (result.blacklist.ZS[gene] > 0) {
          genesUp[gene] = result.blacklist.ZS[gene];
        } else {
          genesDown[gene] = Math.abs(result.blacklist.ZS[gene]);
        }
      }

      setBlacklistData({
        blackListDown: genesDown,
        blackListUp: genesUp,
      });
      setBlacklistLoading(false);
    }).catch((error) => {
      console.error("Failed to load blacklist data:", error);
      setBlacklistData({
        blackListDown: {},
        blackListUp: {},
      });
      setBlacklistLoading(false);
    });
  }, []);

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

const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpressionAnalyzerPage);
export { MainContainer as ExpressionAnalyzerPage };
