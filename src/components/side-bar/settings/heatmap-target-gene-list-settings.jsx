import React from 'react';
import { Spacer, TextArea } from '@oliasoft-open-source/react-ui-library';

const HeatmapTargetGeneListSettings = () => {
  return (
    <>
      <Spacer height={10} />
      <TextArea placeholder="Please enter gene list seperated by comma, new line, space, or semicolon!" />
    </>
  );
};

export { HeatmapTargetGeneListSettings };
