import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  upgeneList: '',
  repulsion: 100,
  cutoff: 0.4,
  depth: 1,
  checkCorr: 'True',
  corrCutOff: 0.3,
  BioGridData:  'True',
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
