import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  numcomponents: 3,
  n_neighbors: 15, 
  min_dist:0.1,
  metric: 'euclidean',  
};

export const umapSettingsSlice = createSlice({
  name: 'umap',
  initialState,
  reducers: {
    umapSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  umapSettingsChanged,
} = umapSettingsSlice.actions;

const umapSettingsReducer = umapSettingsSlice.reducer;

export { umapSettingsReducer };
