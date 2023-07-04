import { createSlice } from '@reduxjs/toolkit';

const initialState = {  
  filterBlackListed:2,
  filter:true,
};

export const genesignatureSettingsSlice = createSlice({
  name: 'genesignature',
  initialState,
  reducers: {
    genesignatureSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    }
  },
});

export const {
  genesignatureSettingsChanged,
} = genesignatureSettingsSlice.actions;

const genesignatureSettingsReducer = genesignatureSettingsSlice.reducer;

export { genesignatureSettingsReducer };
