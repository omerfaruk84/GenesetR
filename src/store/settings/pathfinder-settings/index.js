import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  upgeneList: '',
  repulsion: 100,
  cutoff: 0.4,
  depth: 1,
  checkCorr: 'True',
  corrCutOff: 0.3,
  BioGridData:  'True',  
  isolatednodes: false,
  layout: 'none',
  showLabels:1,
  maxNodeSize:35,
  labelSize:12,
  minNeighbourCount:0, 
  minEdgeopacity:0.35,
  minNodeopacity:0.5,
  dagreSeperation:200,
  // Noise filter settings - enabled by default
  filterBlackListed: 2,
  filterBlackListedExp: 2,
  filterCount: 750,
  filterCountExp: 750,
  filter1Enabled: true,
  filter2Enabled: true,
  filter3Enabled: true,
  filter4Enabled: true,
  filter1Directional: false,
  filter2Directional: false,
  maxNodes: 1000, // Maximum number of nodes to display to prevent crashes
  selectedDatasets: [],
  combinationStrategy: 'intersection',
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
