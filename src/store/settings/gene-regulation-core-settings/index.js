import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedGene: 'SLC39A10',
  absoluteZScore: 0.10,
  corr_cutoff:0.10,
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
  dnr: true
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
