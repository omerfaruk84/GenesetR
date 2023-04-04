import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  numberOfComponents: 85,
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
