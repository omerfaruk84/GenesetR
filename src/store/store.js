import { configureStore } from '@reduxjs/toolkit';
import { settingsReducer } from './settings';

const reducer = {
  settings: settingsReducer
};

export const store = configureStore({
  reducer
});
