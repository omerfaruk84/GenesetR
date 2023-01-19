import { ROUTES } from '../../common/routes';
import { createSlice } from '@reduxjs/toolkit';
import { runPcaGraphCalc, runCorrCalc } from '../api';

const initialState = {
  pcaGraph: null,
  corrCluster: null,
};

export const calculationResults = createSlice({
  name: 'calcResults',
  initialState,
  reducers: {
    pcaGraphReceived: (state, action) => {
      const { result } = action.payload;
      state.pcaGraph = result;
    },
    corrClusterReceived: (state, action) => {
      const { result2 } = action.payload;
      state.corrCluster = result2;
    },
  },
});

const calculationResultsReducer = calculationResults.reducer;

export const {
  pcaGraphReceived,corrClusterReceived,
} = calculationResults.actions;

const runCalculation = (module) => async (dispatch, getState) => {
  const { settings } = getState();
  const { core, pca, heatMap } = settings;
  switch (module) {
    case ROUTES.PCA:     
      const result = await runPcaGraphCalc(core, pca);
      return dispatch(pcaGraphReceived({ result }));
    case ROUTES.HEATMAP:      
      const result2 = await runCorrCalc(core, heatMap);
      return dispatch(corrClusterReceived({ result2 }));
    default:
      throw new Error('This module does not exists');
  }
}

export { calculationResultsReducer, runCalculation };
