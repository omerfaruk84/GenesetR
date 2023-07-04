import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedGene: 'SLC39A10',
  neighbourCount: 2,
  onlyLinked: false,
  absoluteZScore: 0.40,
  corr_cutoff:0.5,
  include_corr: true,
  include_exp: true,
  among_dpr: true,
  among_upr: true,
  unr_dnr: true,
  unr_dpr: true,
  upr_dnr: true,
  upr_dpr: true,
  upr: true,
  dpr: true,
  unr: true,
  dnr: true,
  basedOnFinal : true,
  filter1Enabled:true,
  filter2Enabled:true,
  filter3Enabled:true,
  filter4Enabled:true,
  filter5Enabled:true,
  filter1Directional:false,
  filter2Directional:false,
  filterBlackListed:2,
  filterBlackListedExp:2,
  filterCount1:750,
  filterCount2:750,
  filterCount5:5,
};

export const geneRegulationCoreSettingsSlice = createSlice({
  name: 'geneRegulationCore',
  initialState,
  reducers: {
    geneRegulationCoreSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  geneRegulationCoreSettingsChanged,
} = geneRegulationCoreSettingsSlice.actions;

const geneRegulationCoreSettingsReducer = geneRegulationCoreSettingsSlice.reducer;

export { geneRegulationCoreSettingsReducer };
