import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  gseaDatasets: '',
  genes: '',
};

export const genesetEnrichmentSettingsSlice = createSlice({
  name: 'genesetEnrichment',
  initialState,
  reducers: {
    genesetEnrichmentSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
      console.log("genesetEnrichmentSettingsChanged");
    }
  },
});
export const {
  genesetEnrichmentSettingsChanged
} = genesetEnrichmentSettingsSlice.actions;

const genesetEnrichmentSettingsReducer = genesetEnrichmentSettingsSlice.reducer;

export { genesetEnrichmentSettingsReducer };