import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  genesTolabel:'',
  highlightClusters:true,
  symbolSize:10,  
  clusterProb:true,
  labelLoc: 'left',
  labelSize: 14,
  showLabels: false,
  autorotate : true,
  rotationSpeed:10,
  projection:false,
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
