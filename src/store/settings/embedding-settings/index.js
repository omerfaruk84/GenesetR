import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  embedingSource: 'PCA Data',
  dimensionCount: 2,
  mdeContrsaint: 'Standardized',
  repulsiveFraction: 0.50,
  hdbScanClustering: true,
};

export const embeddingSettingsSlice = createSlice({
  name: 'embedding',
  initialState,
  reducers: {
    dimensionCountChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const embeddingSettingsReducer = embeddingSettingsSlice.reducer;

export { embeddingSettingsReducer };
