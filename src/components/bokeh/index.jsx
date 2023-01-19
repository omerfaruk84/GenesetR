import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Heading } from '@oliasoft-open-source/react-ui-library';
import styles from './bokeh.module.scss';
// import text from './sample.json';

const Bokeh = ({ pcaGraph }) => {
  useEffect(() => {
    if (pcaGraph) {   
      window.Bokeh.embed.embed_item(JSON.parse(pcaGraph), 'myplot');
    }
  }, [pcaGraph])
  return (
    <div className={styles.mainView}>
      <Heading>PCA Graph</Heading>
      <div id='myplot' className={styles.bokehChart}>
      </div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  pcaGraph: calcResults?.pcaGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(Bokeh);

export { MainContainer as Bokeh };;