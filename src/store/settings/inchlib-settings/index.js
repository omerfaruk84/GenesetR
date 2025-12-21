import { createSlice } from '@reduxjs/toolkit';


const initialState = {    
  color_scale: {color: "BuWhRd",
  values: {
    start: { r: 33, g: 113, b: 181 },
    middle: { r: 255, g: 255, b: 255 },
    end: { r: 215, g: 25, b: 28 },
  }},
  width_ratio: 0.9,
  draw_row_ids: true,
  show_row_dendrogram: true, 
  show_column_dendrogram: true,  
  color_percentile_min: -1, 
  color_percentile_max: 1,  
  max_column_width: 100,
  max_row_height: 25, 
  show_column_names: true,
  max_dendrogram_width: 200,
  max_dendrogram_height: 200,
  dendrogram_line_width: 2,
  show_cell_values: false,
};

export const inchlibSettingsSlice = createSlice({
  name: 'inchlib',
  initialState,
  reducers: {
    inchlibSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  inchlibSettingsChanged,
} = inchlibSettingsSlice.actions;

const inchlibSettingsReducer = inchlibSettingsSlice.reducer;

export { inchlibSettingsReducer };
