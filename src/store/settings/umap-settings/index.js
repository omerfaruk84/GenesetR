import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  umapSource: 'PCA Data',
  dimensionCount: 2,
  minimumDistance: 0.1,
  numberOfNeighbours: 5,
  hdbScanClustering: true,
};

export const umapSettingsSlice = createSlice({
  name: 'umap',
  initialState,
  reducers: {
    umapSourceChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const umapSettingsReducer = umapSettingsSlice.reducer;

export { umapSettingsReducer };
