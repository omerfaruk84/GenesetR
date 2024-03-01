import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  filterBlackListed: 2,
  filter: true,
  genesTolabel: "",
  selectedGene: "AAAS",
  corrType: "spearman",
  targetList: "",
  highlightList: "",
  //absoluteZScore,
  //corr_cutoff,
};

export const expressionanalyzerSettingsSlice = createSlice({
  name: "expressionanalyzer",
  initialState,
  reducers: {
    expressionanalyzerSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { expressionanalyzerSettingsChanged } =
  expressionanalyzerSettingsSlice.actions;

const expressionanalyzerSettingsReducer =
  expressionanalyzerSettingsSlice.reducer;

export { expressionanalyzerSettingsReducer };
