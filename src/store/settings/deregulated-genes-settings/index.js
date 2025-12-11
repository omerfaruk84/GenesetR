import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  topNGenes: 500,
  minPerturbations: 2,
  minPerturbationsType: "number", // "number" or "percentage"
  zScoreThreshold: 2.0,
  averageMethod: "zscore", // "zscore" or "rank"
  requireSameDirection: true,
  minDatasets: 2,
};

export const deregulatedGenesSettingsSlice = createSlice({
  name: "deregulatedGenes",
  initialState,
  reducers: {
    deregulatedGenesSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { deregulatedGenesSettingsChanged } =
  deregulatedGenesSettingsSlice.actions;

const deregulatedGenesSettingsReducer = deregulatedGenesSettingsSlice.reducer;

export { deregulatedGenesSettingsReducer };
