import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { GeneSignature } from '../../components/genesignature/genesignature';
import styles from './gene-signature-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/6.webm'

const GeneSignaturePage = (geneRegulationResults) => {
  
console.log(geneRegulationResults)
  return (
    
    <div className={styles.mainView}>
      {geneRegulationResults.geneRegulationResults !== null ? (      
          <GeneSignature data = {geneRegulationResults}/>
          ) : (
            <div>  
            <VideoHelpPage videoFile={helpVideo}/>
            </div>
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
