import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cellLine: 1,
  dataType: 1,
  peturbationList: '',
  targetList: '',
  graphType: '2D',
};

export const graphmapSettingsSlice = createSlice({
  name: 'graphmap',
  initialState,
  reducers: {
    graphmapSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const {
  graphmapSettingsChanged
} = graphmapSettingsSlice.actions;

const graphmapSettingsReducer = graphmapSettingsSlice.reducer;

export { graphmapSettingsReducer };
