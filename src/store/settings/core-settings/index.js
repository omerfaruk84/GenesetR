import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cellLine: 'K562-Whole Gensome',
  dataType: 'Perturbation',
  peturbationList: '',
  graphType: '2D',
  highlightGenes: '',
};

export const coreSettingsSlice = createSlice({
  name: 'core',
  initialState,
  reducers: {
    tsneSourceChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const coreSettingsReducer = coreSettingsSlice.reducer;

export { coreSettingsReducer };
