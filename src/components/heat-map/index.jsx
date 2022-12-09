import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import InCHlib from 'biojs-vis-inchlib'

const HeatMap = ({ data }) => {
  useEffect(() => {
    if (data) {
      // Should inject heat map into div with id=inchlib
      $(function () {
        window.inchlib = new InCHlib({
          target: "inchlib",
          metadata: true,
          column_metadata: true,
          max_height: 1000,
          width: 800,
          heatmap_colors: "Greens",
          metadata_colors: "Reds",
        });
        window.inchlib.read_data(JSON.parse(data));
        window.inchlib.draw();
      });
    }
  }, [data]);

  return <div id='inchlib'></div>;
};

HeatMap.propTypes = {
  data: PropTypes.string.isRequired,
};

export { HeatMap };