import React from "react";
import ClusterHeatmap from "../../components/cluster-heatmap/renderer";
import { CorrelationPage } from "./correlation-page";

// Same page as the correlation module, drawn with the texture-based renderer.
const CorrelationPageFast = (props) => (
  <CorrelationPage {...props} inchlibConstructor={ClusterHeatmap} />
);

export { CorrelationPageFast };
