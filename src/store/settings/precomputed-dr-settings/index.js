import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  hvgStrategy: "union",
  nHvgs: 2000,
  drMethod: "PCA+MDE",
  selectedCellLines: ["K562gwps", "HEK293gwps", "HCT116gwps"],
  colorBy: "cellLine", // "cellLine" or "cluster"
  concatenationMode: "samples", // "samples" or "genes"
  nTopGeneCelllines: 6000, // For 'genes' mode
  useCommonPerturbations: true, // For 'genes' mode: use only common perturbations (recommended)
  useBatchCorrection: false, // Enable Harmony batch correction (only for 'samples' mode)
  batchCorrectionTheta: 1.0, // Harmony theta parameter (diversity clustering penalty)
  batchCorrectionMaxIter: 10, // Maximum iterations for Harmony
};

export const precomputedDrSettingsSlice = createSlice({
  name: "precomputedDr",
  initialState,
  reducers: {
    precomputedDrSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { precomputedDrSettingsChanged } = precomputedDrSettingsSlice.actions;

const precomputedDrSettingsReducer = precomputedDrSettingsSlice.reducer;

export { precomputedDrSettingsReducer };

