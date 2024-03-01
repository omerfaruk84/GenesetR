import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  showvenn: true,
  showcomparison: true,
  genelists: [],
  selectedlists: "",
  mode: 0,
  theme: "Colorful",
  order: 1,
  minsetmember: 1,
  barpadding: 0.3,
  dotpadding: 0.7,
  chartfontsize: 15,
  labelfontsize: 15,
  setheightratio: 0.6,
  setwidthtratio: 0.7,
  settolabel: 0.3,
  widthRatios: [0.23, 0.4],
};

export const genelistcompareSettingsSlice = createSlice({
  name: "genelistcompare",
  initialState,
  reducers: {
    genelistcompareSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { genelistcompareSettingsChanged } =
  genelistcompareSettingsSlice.actions;

const genelistcompareSettingsReducer = genelistcompareSettingsSlice.reducer;

export { genelistcompareSettingsReducer };
