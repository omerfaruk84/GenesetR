import React from 'react';
import { connect } from 'react-redux';
import { ScatterPlot } from '../../components/scatterPlot';
import { ModulePathNames } from '../../store/results/enums';
import { Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import styles from './pca-page.module.scss';

const PcaPage = ({ pcaResults }) => {

  return (
    <div className={styles.mainView}>
      <Heading>PCA</Heading>
        <Spacer />
      {pcaResults ? (
        <ScatterPlot graphData={pcaResults} /> 
      ): (
        <div className={styles.infoSection}>
          <p className={styles.moduleTextInfos}>
            Correlation is a measure of the linear relationship between quantitative variables.
            Two variables are computed against each other and return the correlation coefficient "r"
            that indicates the strength and direction of association in a range from -1 to 1.
          </p>
          <img alt='PCA' src='/images/correlation.png' />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  pcaResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PcaPage);
export { MainContainer as PcaPage };