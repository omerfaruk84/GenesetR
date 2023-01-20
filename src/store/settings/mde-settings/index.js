import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  numcomponents:3,
  preprocessingMethod: 'preserve_neighbors',
  pyMdeConstraint: 'Standardized',
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
