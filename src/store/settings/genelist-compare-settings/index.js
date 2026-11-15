import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Ids (names) of the saved lists being compared; "" until the page has
  // picked the first two lists on its first load
  selectedlists: "",
  view: "upset", // "upset" | "venn"
  // Index into ["intersection", "union", "composite", "distinctIntersection"]
  mode: 3,
  background: 20000, // gene universe of the overlap test
  theme: "Colorful",
  order: 1,
  minsetmember: 1,
  barpadding: 0.3,
  dotpadding: 0.7,
  chartfontsize: 13,
  labelfontsize: 13,
  setlabelfontsize: 13,
  venndiagramfontsize: 16, // New: font size for Venn diagram text
  fontfamily: "Arial, sans-serif", // New: font family setting
  fontweight: "normal", // New: font weight setting
  fontstyle: "normal", // New: font style setting
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
