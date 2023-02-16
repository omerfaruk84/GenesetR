import React, { useEffect } from 'react';
import $ from 'jquery';
import InCHlib from 'biojs-vis-inchlib';
import styles from './heat-map.module.scss';

const HeatMap = ({ graphData }) => {
  useEffect(() => {
    if (graphData) {
      // Should inject heat map into div with id=inchlib
      $(function () {
        window.inchlib = new InCHlib({
          target: "inchlib",
          metadata: false,
          column_metadata: false,
          max_height: 1500,
          width: 1000,
          heatmap_colors: "BuWhRd",
          metadata_colors: "Reds",
          draw_row_ids: true,
          //heatmap_part_width:0.7,
          // column_dendrogram:false,
          // dendrogram:false,
          //fixed_row_id_size:12,
        });
        window.inchlib.read_data(graphData);
        window.inchlib.draw();
      });
    }
  }, [graphData]);

  return (
    <div className={styles.mainView}>
      <div id='inchlib'></div>
    </div>
  );
};

export { HeatMap };
