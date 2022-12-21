import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  removeLowCorrelation: false,
  minCorrelation: 0.30,
  linkageMethod: 'complete',
  distanceMetric: 'euclidean',
  mapColor: 'bwr',
  zScoreNormalization: 'None',
  standardization: 'None',
  coloringRange: {
    min: -0.50,
    max: 0.50,
  },
  size: 5,
};

export const correlationSettingsSlice = createSlice({
  name: 'correlation',
  initialState,
  reducers: {
    minCorrelationChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const correlationSettingsReducer = correlationSettingsSlice.reducer;

export { correlationSettingsReducer };
