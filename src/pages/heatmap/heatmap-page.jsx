import React from 'react';
import { connect } from 'react-redux';
import { Heading, Spacer , Row, Column} from "@oliasoft-open-source/react-ui-library";
import { HeatMap } from '../../components/heat-map/index';
import styles from './heatmap-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/4.webm'

const HeatMapPage = ({ heatmapResults }) => {
  return (
    <div className={styles.mainView}>
       {heatmapResults ? (
        <HeatMap graphData={heatmapResults} />
      ) : (        
      
          <div>  
            <VideoHelpPage videoFile={helpVideo}/>
            </div>
   
   )}
 </div>
);
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  heatmapResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(HeatMapPage);
export { MainContainer as HeatMapPage };