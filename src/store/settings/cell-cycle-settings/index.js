import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedCellLines: [],
  minCells: 0,
  minCellLines: 1,
};

export const cellCycleSettingsSlice = createSlice({
  name: "cellCycle",
  initialState,
  reducers: {
    cellCycleSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { cellCycleSettingsChanged } = cellCycleSettingsSlice.actions;

const cellCycleSettingsReducer = cellCycleSettingsSlice.reducer;

export { cellCycleSettingsReducer };
