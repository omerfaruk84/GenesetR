import React, { useEffect } from 'react';
//import PropTypes from 'prop-types';
import $ from 'jquery';
import InCHlib from 'biojs-vis-inchlib';
import styles from './heat-map.module.scss';
import { connect } from 'react-redux';


const HeatMap = ({ corrCluster }) => {
  useEffect(() => {
    if (corrCluster) {
      // Should inject heat map into div with id=inchlib
      $(function () {
        window.inchlib = new InCHlib({
          target: "inchlib",
          metadata: true,
          column_metadata: true,
          max_height: 1500,
          width: 1000,
          heatmap_colors: "BuWhRd",
          metadata_colors: "Reds",
          draw_row_ids:true,
          dendogram:true,
          fixed_row_id_size:6,         
        });
        window.inchlib.read_data(JSON.parse(corrCluster));
        window.inchlib.draw();
      });
    }
  }, [corrCluster]);

  return (
    <div className={styles.mainView}>
      <div id='inchlib'></div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  corrCluster: calcResults?.corrCluster ?? null,
})

const MainContainer = connect(mapStateToProps)(HeatMap);

//HeatMap.propTypes = {
//  corrCluster: PropTypes.string.isRequired,
//};

export {  MainContainer as HeatMap };







