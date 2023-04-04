import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  minimumClusterSize: 5,
  clusteringMetric: 'euclidean',
  clusteringMethod: 'eom',
  minimumSamples: 0,
  clusterSelectionEpsilon: 0.00,
};

export const clusteringSettingsSlice = createSlice({
  name: 'clustering',
  initialState,
  reducers: {
    clusteringSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

const clusteringSettingsReducer = clusteringSettingsSlice.reducer;

export const {
  clusteringSettingsChanged
} = clusteringSettingsSlice.actions;

export { clusteringSettingsReducer };
