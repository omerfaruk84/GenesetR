import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  biClusteringSource: 'PCA Data',
  clusterCount: 10,
};

export const biClusteringSettingsSlice = createSlice({
  name: 'biClustering',
  initialState,
  reducers: {
    biClusteringSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

const biClusteringSettingsReducer = biClusteringSettingsSlice.reducer;

export const {
  biClusteringSettingsChanged,
} = biClusteringSettingsSlice.actions;

export { biClusteringSettingsReducer };
