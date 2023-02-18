import React from 'react';
import { connect } from 'react-redux';
import { ScatterPlot } from '../../components/scatterPlot';
import { ModulePathNames } from '../../store/results/enums';

const PcaPage = ({ pcaResults }) => {

  return (
    <>
      {pcaResults && (
        <ScatterPlot graphData={pcaResults} /> 
      )}
    </>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  pcaResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(PcaPage);
export { MainContainer as PcaPage };