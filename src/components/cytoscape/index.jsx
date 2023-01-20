import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Heading } from '@oliasoft-open-source/react-ui-library';
import styles from './cytoscape.module.scss';
// import text from './sample.json';

const Cytoscape = ({ pathFinderGraph }) => {
  useEffect(() => {
    if (pathFinderGraph) {   
      window.Bokeh.embed.embed_item(JSON.parse(pathFinderGraph), 'mypathfinder');
    }
  }, [pathFinderGraph])
  return (
    <div className={styles.mainView}>
      <Heading>Path Finder</Heading>
      <div id='mypathfinder' className={styles.bokehChart}>
      </div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  pcaGraph: calcResults?.pcaGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(Cytoscape);

export { MainContainer as Cytoscape };;