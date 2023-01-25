import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Heading } from '@oliasoft-open-source/react-ui-library';
import styles from './cytoscape.module.scss';
import ReactDOM from 'react-dom';
import CytoscapeComponent from 'react-cytoscapejs';
// import text from './sample.json';

const Cytoscape = ({ pathFinderGraph }) => {
  useEffect(() => {
    if (pathFinderGraph) {   
      document.getElementById('mypathfinder').render(<CytoscapeComponent elements={pathFinderGraph} style={ { width: '600px', height: '600px' } } />);     
      
    }
  }, [pathFinderGraph])
  return (
    <div className={styles.mainView}>
      <Heading>Path Finder</Heading>
      <div id='mypathfinder'>
      </div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  pcaGraph: calcResults?.pcaGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(Cytoscape);

export { MainContainer as Cytoscape };;