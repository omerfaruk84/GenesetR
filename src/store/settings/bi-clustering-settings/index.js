import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  n_clusters: 10,  //Anyway to set this to default value is number of genes divided by 20
  n_init:10,
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
