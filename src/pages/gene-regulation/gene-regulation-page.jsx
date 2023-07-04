import React from 'react';
import { connect } from 'react-redux';
import { Row, Column} from '@oliasoft-open-source/react-ui-library';
import { GeneRegulation } from './generegulation';
import styles from './gene-regulation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const GeneRegulationPage = (geneRegulationResults) => {
  
  return (
      <div className={styles.mainView}>
      {geneRegulationResults.geneRegulationResults !== null ? (      
         <GeneRegulation/>
          ) : (
          <>
          <Row height={"350px"} >
          <Column width={"60%"} padding  ={"20px"}  >
            <div style={{ fontSize: "17px"}}>
              <h2>Gene Regulation Module</h2>
              <p/>
              <p>&nbsp; &nbsp; &nbsp; &nbsp;This module enables users to explore the function of a gene of interest 
                (GOI). It allows users to identify genes that are up- or down-regulated upon perturbation of 
                the GOI, pinpoint perturbations that influence GOI expression, discover perturbations that correlate 
                with the perturbation of GOI, and identify genes that demonstrate similar responses as the GOI upon perturbation of other genes. Users can create 
                networks centered around a GOI, thus identifying upstream regulators and expanding the network to include 
                downstream targets influenced by the knockdown of the GOI. To enhance reliability, interactions among
                 upstream positive regulators, upstream negative regulators, and downstream targets are evaluated. 
                 The software also emphasizes logical connections around the GOI, helping to identify stronger links 
                 and providing a comprehensive view of regulatory pathways. User-friendly visualization, viewing, and
                  downloading of data as tables are provided.</p>

              <p>&nbsp; &nbsp; &nbsp; &nbsp;The module generates dense data sets that necessitate filtering for better
                 interpretation of underlying biological processes. Filters include thresholds for interaction
                strengths, including/excluding various types of interactions, displaying only genes with a minimum 
                number of interactions, and excluding isolated genes. Two main sources of noise from RNA-Seq experiments
                are addressed: global mRNA level changes and abnormal expression of certain genes due to perturbations.
                Filters help detect and mitigate these noise sources, enhancing the clarity and reliability of the
                results. However, filters should be used judiciously considering the biological context and specific
                analysis goals.</p>            </div>
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


const MainContainer = connect(mapStateToProps)(GeneRegulationPage);
export { MainContainer as GeneRegulationPage };
