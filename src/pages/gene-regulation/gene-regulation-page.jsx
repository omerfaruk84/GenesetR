import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { ChartTableResultsGene } from './chart-table-gene-results';
import styles from './gene-regulation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const GeneRegulationPage = () => {
  

  return (
    <div className={styles.mainView}>
      <Heading>Gene Regulation</Heading>
      <Spacer />
      <Row wrap width="100%" height="100%">
        <Column width="100%" height="100%"  widthTablet="100%">
          <ChartTableResultsGene/>
        </Column>       
      </Row>
    </div>
  );
};


const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationPage);
export { MainContainer as GeneRegulationPage };
