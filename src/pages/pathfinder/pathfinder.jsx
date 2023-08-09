import React from 'react';
import { connect } from 'react-redux';
import { PathFinder } from '../../components/pathfinder';
import { ModulePathNames } from '../../store/results/enums';
import { Row, Column} from "@oliasoft-open-source/react-ui-library";
import styles from './pathfinder-page.module.scss';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/5.webm'
const PathFinderPage = ({ pathfinderResults }) => {

  return (
    <div className={styles.mainView}>
     
      {pathfinderResults ? (
        <PathFinder graphData={pathfinderResults} /> 
      ): (
        <div>  
        <VideoHelpPage videoFile={helpVideo}/>
        </div>

      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  pathfinderResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PathFinderPage);
export { MainContainer as PathFinderPage };