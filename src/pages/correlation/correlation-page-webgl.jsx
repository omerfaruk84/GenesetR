import React from "react";
import InCHlib2 from "../../store/extra/inchlib-2.0.js";
import { CorrelationPage } from "./correlation-page";

const CorrelationPageWebGL = (props) => (
  <CorrelationPage {...props} inchlibConstructor={InCHlib2} />
);

export { CorrelationPageWebGL };
