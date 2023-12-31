import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  repulsion: 100,
  dataType: 1,
  isolatednodes: false,
  targetList: '',
  layout: 'force',
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
