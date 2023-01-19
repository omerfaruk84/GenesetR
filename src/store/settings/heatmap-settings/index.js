import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  row_linkage: 'single',
  column_linkage: 'ward',
  row_distance: 'euclidean',
  column_distance: 'euclidean',
  mapColor: 'bwr',
  normalize: "True",
  write_original: "True",  
  coloringRange: {
    min: -0.50,
    max: 0.50,
  },
  size: 5,
  targetGeneList: '',
};

export const heatMapSettingsSlice = createSlice({
  name: 'heatMap',
  initialState,
  reducers: {
    heatMapSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  heatMapSettingsChanged,
} = heatMapSettingsSlice.actions;

const heatMapSettingsReducer = heatMapSettingsSlice.reducer;

export { heatMapSettingsReducer };
