import React from 'react';
import { connect } from 'react-redux';
import { PathFinder } from '../../components/pathfinder';
import { ModulePathNames } from '../../store/results/enums';
import { Row, Column} from "@oliasoft-open-source/react-ui-library";
import styles from './pathfinder-page.module.scss';
const PathFinderPage = ({ pathfinderResults }) => {

  return (
    <div className={styles.mainView}>
     
      {pathfinderResults ? (
        <PathFinder graphData={pathfinderResults} /> 
      ): (


        <>
          <Row height={"350px"} >
          <Column width={"60%"} padding  ={"20px"}  >
            <div style={{ fontSize: "17px"}}>
              <h2 style={{textAlign: "center"}}>Pathway Explorer Module!</h2>              
              <p>&nbsp; &nbsp; &nbsp; &nbsp;This feature-rich module leverages GWPS data to construct pathways amongst your selected genes, making it an invaluable tool for RNA-seq data analyses. Input your list of downregulated and upregulated genes and select your z-score threshold to start mapping out the links between perturbed genes and their targets. Pathway Explorer can even augment pathways with perturbation correlation information from the GWPS data or protein-protein interaction data from the BioGRID database, providing deeper context and insights into molecular links.</p>
              <p>&nbsp;&nbsp; &nbsp; &nbsp; &nbsp;Beyond RNA-seq data analysis, the Pathway Explorer module can illuminate key nodes among the submitted genes, unveiling the complex interactions that shape observed phenotypes. The resulting network is readily visualized with node sizes, opacity, and link attributes indicating interaction counts, knockdown efficiency, and effect sizes, respectively. Whether in the analysis of data from an omics screen or exploring the dynamics of gene-gene interactions, Pathway Explorer serves as a window into the complex world of genetic interplay.</p>
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
  pathfinderResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PathFinderPage);
export { MainContainer as PathFinderPage };