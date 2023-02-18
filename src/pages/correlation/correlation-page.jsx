import React from 'react';
import { connect } from 'react-redux';
import { Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import { HeatMap } from '../../components/heat-map';
import styles from './correlation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const CorrelationPage = ({ _path, corrResults }) => {
  return (
    <div className={styles.mainView}>
      <Heading>Correlation</Heading>
      <Spacer />
      {corrResults ? (
        <HeatMap graphData={corrResults} />
      ) : (
        <div className={styles.infoSection}>
          <p className={styles.moduleTextInfos}>
            Correlation is a measure of the linear relationship between quantitative variables.
            Two variables are computed against each other and return the correlation coefficient "r"
            that indicates the strength and direction of association in a range from -1 to 1.
          </p>
          <img alt='correlation' src='/images/correlation.png' />
        </div>
      )}
    </div>
  );
}

const mapStateToProps = ({ calcResults }, { path }) => ({
  corrResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(CorrelationPage);
export { MainContainer as CorrelationPage };