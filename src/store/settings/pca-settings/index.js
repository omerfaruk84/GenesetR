import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  pcaSource: 'Correlation Data',
  numberOfComponents: 10,
  hdbScanClustering: true,
};

export const pcaSettingsSlice = createSlice({
  name: 'pca',
  initialState,
  reducers: {
    pcaSourceChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const pcaSettingsReducer = pcaSettingsSlice.reducer;

export { pcaSettingsReducer };
