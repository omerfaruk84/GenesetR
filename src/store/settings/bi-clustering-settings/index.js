import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  biClusteringSource: 'PC Data',
  clusterCount: 10,
};

export const biClusteringSettingsSlice = createSlice({
  name: 'biClustering',
  initialState,
  reducers: {
    biClusteringSourceChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const biClusteringSettingsReducer = biClusteringSettingsSlice.reducer;

export { biClusteringSettingsReducer };
