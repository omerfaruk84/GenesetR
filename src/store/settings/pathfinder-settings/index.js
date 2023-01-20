import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  upgeneList: '',
  cutoff: 0.1,
  depth: 1,
  checkCorr: 'True',
  corrCutOff: 0.1,
  BioGridData: 'True',
};

export const pathfinderSettingsSlice = createSlice({
  name: 'pathfinder',
  initialState,
  reducers: {
    pathfinderSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  pathfinderSettingsChanged,
} = pathfinderSettingsSlice.actions;

const pathfinderSettingsReducer = pathfinderSettingsSlice.reducer;

export {pathfinderSettingsReducer };
