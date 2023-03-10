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
          <img alt='PCA' src='/images/PCA.png' className={`${styles['float-right']}`}/>
          Principal Component Analysis (PCA) aids visualization and interpretation of rich datasets by reducing their dimensionality with minimal information loss. Given a dataset with an N-dimensional space, where N represents the number of variables under investigation, PCA summarizes the data by making a linear transformation of vectors into a new coordinate system with fewer, uncorrelated variables - the Principal Components. These variables successively maximize variance from the original matrix and graphically simplify the identification of trends, clusters, and correlation among the subjects to analysis.
          
          <p style={{ color: 'DodgerBlue'}} > <a href="https://en.wikipedia.org/wiki/Principal_component_analysis" target="_blank" rel="noreferrer">Read More</a> </p>

          </p>
          
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