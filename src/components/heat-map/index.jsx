import React, { useEffect } from 'react';
//import PropTypes from 'prop-types';
import $ from 'jquery';
import InCHlib from 'biojs-vis-inchlib';
import styles from './heat-map.module.scss';
import { connect } from 'react-redux';


const HeatMap = ({ corrCluster , heatmapGraph, currentGraph}) => {
  useEffect(() => {
    if (corrCluster || heatmapGraph ) {
      // Should inject heat map into div with id=inchlib
     
      {console.log(currentGraph)}

      $(function () {
        window.inchlib = new InCHlib({
          target: "inchlib",
          metadata: false,
          column_metadata: false,
          max_height: 1500,
          width: 1000,
          heatmap_colors: "BuWhRd",
          metadata_colors: "Reds",
          draw_row_ids:true,
          //heatmap_part_width:0.7,
          
         // column_dendrogram:false,
         // dendrogram:false,
          //fixed_row_id_size:12,         
        });
        if (currentGraph == "heatmapGraph" && heatmapGraph) {
        window.inchlib.read_data(JSON.parse(heatmapGraph));
        }else if(currentGraph == "corrCluster" && corrCluster) {
        window.inchlib.read_data(JSON.parse(corrCluster)); 
        }
        window.inchlib.draw();
      });
    }
  }, [corrCluster,heatmapGraph]);

  return (
    <div className={styles.mainView}>
      <div id='inchlib'></div>
    </div>
  );
};

const mapStateToProps = ({ calcResults }) => ({
  corrCluster: calcResults?.corrCluster ?? null,
  heatmapGraph: calcResults?.heatmapGraph ?? null,
  currentGraph: calcResults?.currentGraph ?? null,
})

const MainContainer = connect(mapStateToProps)(HeatMap);

//HeatMap.propTypes = {
//  corrCluster: PropTypes.string.isRequired,
//};

export {  MainContainer as HeatMap };







