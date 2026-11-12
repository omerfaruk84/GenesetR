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
  reducer,
  // Redux DevTools keeps a history of dispatched actions. Analysis results are
  // dispatched as actions and can be tens of megabytes each, so with the
  // browser extension installed the production tab grew with every analysis.
  devTools: process.env.NODE_ENV !== "production",
});
