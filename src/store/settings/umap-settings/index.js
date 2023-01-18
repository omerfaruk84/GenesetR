import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  umapSource: 'PCA Data',
  dimensionCount: 2,
  minimumDistance: 0.1,
  numberOfNeighbours: 5, 
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
