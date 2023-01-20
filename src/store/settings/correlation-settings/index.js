import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  filter: 0.3,
  row_linkage: 'single',
  column_linkage: 'ward',
  row_distance: 'euclidean',
  column_distance: 'euclidean',
  axis: 'row',  
  normalize: 'True',
  write_original: 'True',
};

export const correlationSettingsSlice = createSlice({
  name: 'correlation',
  initialState,
  reducers: {
    correlationSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  correlationSettingsChanged,
} = correlationSettingsSlice.actions;

const correlationSettingsReducer = correlationSettingsSlice.reducer;

export { correlationSettingsReducer };
