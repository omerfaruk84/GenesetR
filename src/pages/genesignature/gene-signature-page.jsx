import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { GeneSignature } from '../../components/genesignature/genesignature';
import styles from './gene-signature-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const GeneSignaturePage = (geneRegulationResults) => {
  

  return (
    <div className={styles.mainView}>
      <Heading>Gene Regulation</Heading>
      <Spacer />
      <Row wrap width="100%" height="100%">
        <Column width="100%" height="100%"  widthTablet="100%">
          <GeneSignature data = {geneRegulationResults}/>
        </Column>       
      </Row>
    </div>
  );
};


const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignaturePage);
export { MainContainer as GeneSignaturePage };
