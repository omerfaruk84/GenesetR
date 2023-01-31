import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  
  row_linkage: 'complete',
  column_linkage: 'complete',
  row_distance: 'euclidean',
  column_distance: 'euclidean',
  axis: 'both',  
  normalize: 'True',
  write_original: 'True',    
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
