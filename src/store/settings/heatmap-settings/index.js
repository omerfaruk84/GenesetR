import { createSlice } from '@reduxjs/toolkit';

const initialState = {
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
  targetGeneList: '',
};

export const heatMapSettingsSlice = createSlice({
  name: 'heatMap',
  initialState,
  reducers: {
    heatMapSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  heatMapSettingsChanged,
} = heatMapSettingsSlice.actions;

const heatMapSettingsReducer = heatMapSettingsSlice.reducer;

export { heatMapSettingsReducer };
