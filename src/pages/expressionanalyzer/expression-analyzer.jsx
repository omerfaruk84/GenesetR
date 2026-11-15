import React from "react";
import { connect } from "react-redux";
import { ExpressionAnalyzer } from "../../components/expressionanalyzer/expressionanalyzer";
import styles from "./expression-analyzer.module.scss";
import { ModulePathNames } from "../../store/results/enums";
import { Notice } from "../../components/ui";

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
        <Notice kind="info">
          To start, select a dataset and a gene in the left sidebar. The
          analysis runs when a gene is selected; use "Analyze Expression" to
          run it again.
        </Notice>
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
