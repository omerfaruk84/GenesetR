import React from 'react';
import { connect } from 'react-redux';
import { ScatterPlot } from '../../components/scatterPlot';
import { ModulePathNames } from '../../store/results/enums';

const MdePage = ({ mdeResults }) => {

  return (
    <>
      {mdeResults && (
        <ScatterPlot graphData={mdeResults} /> 
      )}
    </>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  mdeResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(MdePage);
export { MainContainer as MdePage };