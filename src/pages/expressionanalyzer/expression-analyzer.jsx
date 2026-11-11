import React from "react";
import { connect } from "react-redux";
import { ExpressionAnalyzer } from "../../components/expressionanalyzer/expressionanalyzer";
import styles from "./expression-analyzer.module.scss";
import { ModulePathNames } from "../../store/results/enums";

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
        <div
          style={{
            padding: "12px",
            backgroundColor: "#e3f2fd",
            borderLeft: "4px solid #1976d2",
            borderRadius: "4px",
            color: "#1565c0",
            marginBottom: "8px",
          }}
        >
          To start, select a dataset and a gene in the left sidebar. The
          analysis runs when a gene is selected; use "Analyze Expression" to
          run it again.
        </div>
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
