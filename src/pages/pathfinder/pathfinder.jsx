import React from 'react';
import { connect } from 'react-redux';
import { Cytoscape } from '../../components/cytoscape';
import { ModulePathNames } from '../../store/results/enums';
import { Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import styles from './pathfinder-page.module.scss';

const PathFinderPage = ({ pathfinderResults }) => {

  return (
    <div className={styles.mainView}>
      <Heading>Path Finder</Heading>
        <Spacer />
      {pathfinderResults ? (
        <Cytoscape graphData={pathfinderResults} /> 
      ): (
        <div className={styles.infoSection}>
          <p className={styles.moduleTextInfos}>
            Correlation is a measure of the linear relationship between quantitative variables.
            Two variables are computed against each other and return the correlation coefficient "r"
            that indicates the strength and direction of association in a range from -1 to 1.
          </p>
          <img alt='UMAP' src='/images/correlation.png' />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  pathfinderResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PathFinderPage);
export { MainContainer as PathFinderPage };