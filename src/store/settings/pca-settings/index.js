import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  numberOfComponents: 10,
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
