import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedGene: 'SLC39A10',
  absoluteZScore: 0.10,
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
