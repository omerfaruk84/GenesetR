import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  embedingSource: 'PCA Data',
  dimensionCount: 2,
  mdeContrsaint: 'Standardized',
  repulsiveFraction: 0.50,
  hdbScanClustering: true,
};

export const embeddingSettingsSlice = createSlice({
  name: 'embedding',
  initialState,
  reducers: {
    embeddingSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  embeddingSettingsChanged,
} = embeddingSettingsSlice.actions;

const embeddingSettingsReducer = embeddingSettingsSlice.reducer;

export { embeddingSettingsReducer };
