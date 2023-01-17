import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tsneSource: 'PCA Data',
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
    tsneSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  tsneSettingsChanged,
} = tsneSettingsSlice.actions;

const tsneSettingsReducer = tsneSettingsSlice.reducer;

export { tsneSettingsReducer };
