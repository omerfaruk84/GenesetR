import { configureStore } from '@reduxjs/toolkit';
import { settingsReducer } from './settings';
import { calculationResultsReducer } from './results';

const reducer = {
  settings: settingsReducer,
  calcResults: calculationResultsReducer
};

export const store = configureStore({
  reducer
});
