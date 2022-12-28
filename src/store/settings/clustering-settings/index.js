import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showLegend: true,
  showClusterCenters: true,
  highlightClusters: true,
  minimumClusterSize: 10,
  clusteringMetric: 'euclidean',
  clusteringMethod: 'EOM',
  minimumSamples: 10,
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
