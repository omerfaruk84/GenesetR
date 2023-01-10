import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  pcaSource: 2,
  numberOfComponents: 10,
  hdbScanClustering: true,
};

export const pcaSettingsSlice = createSlice({
  name: 'pca',
  initialState,
  reducers: {
    pcaSourceChanged: (state, action) => {
      const { value } = action.payload;
      state.pcaSource = value;
    },
    numberOfComponentsChanged: (state, action) => {
      const { value } = action.payload;
      state.numberOfComponents = value;
    },
    hdbScanClusteringChanged: (state, action) => {
      const { value } = action.payload;
      state.hdbScanClustering = value;
    },
  },
});

export const {
  pcaSourceChanged,
  numberOfComponentsChanged,
  hdbScanClusteringChanged,
} = pcaSettingsSlice.actions;

const pcaSettingsReducer = pcaSettingsSlice.reducer;

export { pcaSettingsReducer };
