import { ROUTES } from '../../common/routes';
import { createSlice } from '@reduxjs/toolkit';
import { runPcaGraphCalc } from '../api';

const initialState = {
  pcaGraph: null,
};

export const calculationResults = createSlice({
  name: 'calcResults',
  initialState,
  reducers: {
    pcaGraphReceived: (state, action) => {
      const { result } = action.payload;
      state.pcaGraph = result;
    },
  },
});

const calculationResultsReducer = calculationResults.reducer;

export const {
  pcaGraphReceived,
} = calculationResults.actions;

const runCalculation = (module) => async (dispatch, getState) => {
  const { settings } = getState();
  switch (module) {
    case ROUTES.PCA:
      const { core, pca } = settings;
      const result = await runPcaGraphCalc(core, pca);
      return dispatch(pcaGraphReceived({ result }));
    default:
      throw new Error('This module does not exists');
  }
}

export { calculationResultsReducer, runCalculation };
