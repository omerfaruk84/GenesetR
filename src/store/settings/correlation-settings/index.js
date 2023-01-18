import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  removeLowCorrelation: false,
  minCorrelation: 0.3,
  linkageMethod: 'complete',
  distanceMetric: 'euclidean',
  mapColor: 'bwr',
  zScoreNormalization: 'None',
  standardization: 'None',
  coloringRange: [-0.50, 0.50],
  size: 5,
};

export const correlationSettingsSlice = createSlice({
  name: 'correlation',
  initialState,
  reducers: {
    correlationSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  correlationSettingsChanged,
} = correlationSettingsSlice.actions;

const correlationSettingsReducer = correlationSettingsSlice.reducer;

export { correlationSettingsReducer };
