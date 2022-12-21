import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showLegend: true,
  showClusterCenters: true,
  highlightClusters: true,
  minimumClusterSize: 10,
  clusteringMetric: 'euclidean',
  clusteringMethod: 'EOM',
  minimumSamples: 10,
  ClusterSelectionEpsilon: 0.00,
};

export const clusteringSettingsSlice = createSlice({
  name: 'clustering',
  initialState,
  reducers: {
    showLegendChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const clusteringSettingsReducer = clusteringSettingsSlice.reducer;

export { clusteringSettingsReducer };
