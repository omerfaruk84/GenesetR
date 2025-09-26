import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedGene: "",
  corrType: "pearson",
  targetList: "",
};

export const multidatasetComparisonSettingsSlice = createSlice({
  name: "multidatasetComparison",
  initialState,
  reducers: {
    multidatasetComparisonSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { multidatasetComparisonSettingsChanged } = multidatasetComparisonSettingsSlice.actions;

const multidatasetComparisonSettingsReducer = multidatasetComparisonSettingsSlice.reducer;

export { multidatasetComparisonSettingsReducer }; 