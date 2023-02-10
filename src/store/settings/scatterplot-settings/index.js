import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  repulsion: 100,
  dataType: 1,
  isolatednodes: false,
  targetList: '',
  layout: 'force',
};

export const scatterplotSettingsSlice = createSlice({
  name: 'scatterplot',
  initialState,
  reducers: {
    scatterplotSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const {
  scatterplotSettingsChanged
} = scatterplotSettingsSlice.actions;

const scatterplotSettingsReducer = scatterplotSettingsSlice.reducer;

export { scatterplotSettingsReducer };
