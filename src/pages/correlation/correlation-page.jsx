import React, {useRef } from 'react';
import { connect } from 'react-redux';
import { Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import { HeatMap } from '../../components/heat-map';
import styles from './correlation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/1.webm'


const CorrelationPage = ({ corrResults }) => {
  return (
    <div className={styles.mainView}>    
      
      {corrResults ? (
        <HeatMap graphData={corrResults} />
      ) : (  
        <div>  
       <VideoHelpPage videoFile={helpVideo}/>
       </div>
      )}
    </div>
  );
}

const mapStateToProps = ({ calcResults }, { path }) => ({
  corrResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(CorrelationPage);
export { MainContainer as CorrelationPage };