import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  filter: 0.3,
  row_linkage: 'average',
  column_linkage: 'average',
  row_distance: 'euclidean',
  column_distance: 'euclidean',
  axis: 'both',  
  normalize: false,
  write_original: true,
  corrType:"spearman",
  row_col_sameorder:true,
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
