import { configureStore } from '@reduxjs/toolkit';
import { settingsReducer } from './settings';

const reducer = {
};

export const store = configureStore({
  reducer
});
