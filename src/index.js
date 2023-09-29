import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import reportWebVitals from "./reportWebVitals";
import { Application } from "./application";
import { store } from "./store/store";
import "@oliasoft-open-source/react-ui-library/dist/global.css";

// Disable console.log in production
if (process.env.NODE_ENV === "production") {
  console.log = function () {};
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <Application />
  </Provider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
