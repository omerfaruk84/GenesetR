import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  gseaDatasets: '',
  clusters: '',
  pValueTreshold: 0.05,
  qValueTreshold: 0.05,
  minNumberOfGenes: 3,
};

export const genesetEnrichmentSettingsSlice = createSlice({
  name: 'genesetEnrichment',
  initialState,
  reducers: {
    clustersChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const genesetEnrichmentSettingsReducer = genesetEnrichmentSettingsSlice.reducer;

export { genesetEnrichmentSettingsReducer };

