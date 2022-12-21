import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedGene: 'SLC39A10',
  absoluteZScore: 0.10,
};

export const geneRegulationCoreSettingsSlice = createSlice({
  name: 'geneRegulationCore',
  initialState,
  reducers: {
    selectedGeneChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const geneRegulationCoreSettingsReducer = geneRegulationCoreSettingsSlice.reducer;

export { geneRegulationCoreSettingsReducer };
