import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Gene list to query (perturbed genes)
  geneList: "",
  // Selected cell lines for analysis
  selectedCellLines: [],
  // Selected signatures to display (empty = all)
  selectedSignatures: [],
  // Display mode: "heatmap" or "table"
  displayMode: "heatmap",
  // Clustering settings for heatmap
  clusterRows: true,
  clusterColumns: true,
  // Color scale
  colorScale: "RdBu",
  // Show values in heatmap cells
  showValues: false,
  // Z-score cutoff for highlighting
  zScoreCutoff: 2.0,
  // Sort order for table view
  sortBy: "zScore",
  sortOrder: "desc",
  // Filter settings
  filterBlackListed: true,
  minAbsScore: 0,
};

export const perturbationSignaturesSettingsSlice = createSlice({
  name: "perturbationSignatures",
  initialState,
  reducers: {
    perturbationSignaturesSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
    resetPerturbationSignaturesSettings: (state) => {
      return initialState;
    },
  },
});

export const {
  perturbationSignaturesSettingsChanged,
  resetPerturbationSignaturesSettings,
} = perturbationSignaturesSettingsSlice.actions;

const perturbationSignaturesSettingsReducer = perturbationSignaturesSettingsSlice.reducer;

export { perturbationSignaturesSettingsReducer };
