import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cellLine: 1,
  dataType: 1,
  peturbationList: '',
  graphType: '2D',
  highlightGenes: '',
};

export const coreSettingsSlice = createSlice({
  name: 'core',
  initialState,
  reducers: {
    coreSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const {
  coreSettingsChanged
} = coreSettingsSlice.actions;

const coreSettingsReducer = coreSettingsSlice.reducer;

export { coreSettingsReducer };
