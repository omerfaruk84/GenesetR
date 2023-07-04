import React from 'react';
import { connect } from 'react-redux';
import { Heading, Spacer , Row, Column} from "@oliasoft-open-source/react-ui-library";
import { HeatMap } from '../../components/heat-map';
import styles from './heatmap-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const HeatMapPage = ({ heatmapResults }) => {
  return (
    <div className={styles.mainView}>
       {heatmapResults ? (
        <HeatMap graphData={heatmapResults} />
      ) : (        
      <>
        <Row height={"350px"} >
          <Column width={"60%"} padding  ={"20px"}  >
            <div style={{ fontSize: "17px"}}>
              <h2>HeatMap Module</h2>              
              <p>&nbsp; &nbsp; &nbsp; &nbsp;The HeatMap module translates intricate gene expression information into 
                visually engaging and interactive heat maps. Derived from a user defined input of gene and 
                perturbation lists, these heat maps deploy the Inchlib library to offer versatile data visualization.</p>
              
              <p>&nbsp;&nbsp; &nbsp; &nbsp; &nbsp;The Heatmap module interface is not just visually intuitive,
                 but is also interactive. You can zoom into clusters of interest, 
                 compile gene lists directly from those clusters, and execute GSEA with just a click.
                  With this moedule, delve deeper into the realm of GWPS data, uncover trends, and understand gene 
                  expression dynamics in response to perturbations. </p>
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
  heatmapResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(HeatMapPage);
export { MainContainer as HeatMapPage };