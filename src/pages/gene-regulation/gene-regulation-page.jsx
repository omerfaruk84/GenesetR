import React from 'react';
import { connect } from 'react-redux';
import { Row, Column} from '@oliasoft-open-source/react-ui-library';
import { GeneRegulation } from './generegulation';
import styles from './gene-regulation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/3.webm'

const GeneRegulationPage = (geneRegulationResults) => {
  
  return (
      <div className={styles.mainView}>



{geneRegulationResults.geneRegulationResults !== null ? (
 <GeneRegulation/>
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


const MainContainer = connect(mapStateToProps)(GeneRegulationPage);
export { MainContainer as GeneRegulationPage };
