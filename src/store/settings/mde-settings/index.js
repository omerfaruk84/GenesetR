import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  embedingSource: 'PCA Data',
  dimensionCount: 2,
  mdeContrsaint: 'Standardized',
  repulsiveFraction: 0.5,
};

export const mdeSettingsSlice = createSlice({
  name: 'mde',
  initialState,
  reducers: {
    mdeSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  mdeSettingsChanged,
} = mdeSettingsSlice.actions;

const mdeSettingsReducer = mdeSettingsSlice.reducer;

export { mdeSettingsReducer };
