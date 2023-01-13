import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  pcaSource: 2,
  numberOfComponents: 10,
  hdbScanClustering: true,
};

export const pcaSettingsSlice = createSlice({
  name: 'pca',
  initialState,
  reducers: {
    pcaSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const {
  pcaSettingsChanged,
} = pcaSettingsSlice.actions;

const pcaSettingsReducer = pcaSettingsSlice.reducer;

export { pcaSettingsReducer };
