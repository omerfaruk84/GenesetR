import React from 'react';
import { connect } from 'react-redux';
import { Spacer, TextArea } from '@oliasoft-open-source/react-ui-library';

const HeatmapTargetGeneListSettings = ({
  heatMapSettings,
}) => {
  return (
    <>
      <Spacer height={10} />
      <TextArea
        placeholder="Please enter the gene list seperated by comma, new line, space, or semicolon."
        value={heatMapSettings?.targetGeneList}
        rows={10}
      />
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  heatMapSettings: settings?.heatMap ?? {},
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(HeatmapTargetGeneListSettings);

export { MainContainer as HeatmapTargetGeneListSettings };
