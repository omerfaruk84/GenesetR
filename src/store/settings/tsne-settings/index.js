import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tsneSource: 'PC Data',
  perplexity: 5,
  learningRate: 200,
  numberOfIterations: 1000,
  earlyExaggeration: 5,
  hdbScanClustering: true,
};

export const tsneSettingsSlice = createSlice({
  name: 'tsne',
  initialState,
  reducers: {
    tsneSourceChanged: (state, action) => {
      console.log(state, action);
    }
  },
});

const tsneSettingsReducer = tsneSettingsSlice.reducer;

export { tsneSettingsReducer };
