import { configureStore } from '@reduxjs/toolkit';
import { settingsReducer } from './settings';
import { calculationResultsReducer } from './results';
import { blacklistReducer } from './blacklist';

const reducer = {
  settings: settingsReducer,
  calcResults: calculationResultsReducer,
  blacklist: blacklistReducer
};

export const store = configureStore({
  reducer
});
