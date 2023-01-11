import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cellLine: 'K562-Whole Gensome',
  dataType: 1,
  peturbationList: '',
  graphType: '2D',
  highlightGenes: '',
};

export const coreSettingsSlice = createSlice({
  name: 'core',
  initialState,
  reducers: {
      cellLineChanged: (state, action) => {
      const { value } = action.payload;
      state.cellLine = value;
    },
    dataTypeChanged: (state, action) => {
      const { value } = action.payload;
      state.dataType = value;
    },
    peturbationListChanged: (state, action) => {
      const { value } = action.payload;
      state.peturbationList = value;
    },
    graphTypeChanged: (state, action) => {
      const { value } = action.payload;
      state.graphType = value;
    },
    highlightGenesChanged: (state, action) => {
      const { value } = action.payload;
      state.highlightGenes = value;
    },
  },
});

export const {
  cellLineChanged,
  dataTypeChanged,
  peturbationListChanged,
  graphTypeChanged,
  highlightGenesChanged,
} = coreSettingsSlice.actions;

const coreSettingsReducer = coreSettingsSlice.reducer;

export { coreSettingsReducer };
