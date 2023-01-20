import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  numcomponents: 2, 
  metric:'euclidean',
  perplexity: 30,
  earlyExaggeration: 12,
  learning_rate: 'auto',
  n_iter: 1000,
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
