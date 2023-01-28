import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import $ from 'jquery';
import { Heading } from '@oliasoft-open-source/react-ui-library';
import styles from './bokeh.module.scss';

const Bokeh = ({ currentGraph, pcaGraph,mdeGraph,umapGraph,tsneGraph }) => {
  useEffect(() => {

    {console.log(currentGraph);}
    if (currentGraph == "pcaGraph" && pcaGraph) {
      $('.bk-Row').remove();
      window.Bokeh.embed.embed_item(JSON.parse(pcaGraph), 'myplot');
    }
    if (currentGraph == "mdeGraph" && mdeGraph) {
      $('.bk-Row').remove();
      window.Bokeh.embed.embed_item(JSON.parse(mdeGraph), 'myplot');
    }
    if (currentGraph == "umapGraph" && umapGraph) {
      $('.bk-Row').remove();
      window.Bokeh.embed.embed_item(JSON.parse(umapGraph), 'myplot');
    }
    if (currentGraph == "tsneGraph" && tsneGraph) {
      $('.bk-Row').remove();
      window.Bokeh.embed.embed_item(JSON.parse(tsneGraph), 'myplot');
    }

  }, [mdeGraph, tsneGraph, umapGraph, currentGraph])
  return (
    <div className={styles.mainView}>      
      <div id='myplot' className={styles.bokehChart}>
      </div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  pcaGraph: calcResults?.pcaGraph ?? null,
  mdeGraph: calcResults?.mdeGraph ?? null,
  umapGraph: calcResults?.umapGraph ?? null,
  tsneGraph: calcResults?.tsneGraph ?? null,
  currentGraph: calcResults?.currentGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(Bokeh);

export { MainContainer as Bokeh };;