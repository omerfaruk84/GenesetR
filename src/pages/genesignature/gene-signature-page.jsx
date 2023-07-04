import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { GeneSignature } from '../../components/genesignature/genesignature';
import styles from './gene-signature-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const GeneSignaturePage = (geneRegulationResults) => {
  
console.log(geneRegulationResults)
  return (
    
    <div className={styles.mainView}>
      {geneRegulationResults.geneRegulationResults !== null ? (      
          <GeneSignature data = {geneRegulationResults}/>
          ) : (
          <>
          <Row height={"350px"} >
          <Column width={"60%"} padding  ={"20px"}  >
            <div style={{ fontSize: "17px"}}>
              <h2>Gene Signature Module</h2>
              <p/>
              <p>&nbsp; &nbsp; &nbsp; &nbsp;The Gene Signature Module is the essential tool for discovering the genes propelling distinct expression profiles upon their knockdown. It offers an insightful look into the hidden dynamics of gene expression. Using z-score normalized expression data, this tool effectively processes gene signatures, provided as mathematical expressions, transforming them into a list of perturbations along with their respective average values.</p>
            </div>
            </Column>

          <Column width={"40%"} >
            <div className={styles.slideshow}>
              <img alt='Pearson correlation sensitive to outliers' src='/images/corr-false-positive.png' className={`${styles['float-right']} ${styles['responsive-image']}`} />
              <img alt='Pearson correlation sensitive to outliers' src='/images/corr-false-negative.png' className={`${styles['float-right']} ${styles['responsive-image']}`} />
              <img alt='Pearson correlation sensitive to outliers' src='/images/PCA.png' className={`${styles['float-right']} ${styles['responsive-image']}`} />

            </div>
            </Column>
          
            </Row>
            </>
          )}
    </div>
  );
};



const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignaturePage);
export { MainContainer as GeneSignaturePage };
