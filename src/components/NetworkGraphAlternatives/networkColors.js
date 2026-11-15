/**
 * Colours of the regulation networks (pathway explorer, gene regulation and
 * its alternative renderers), one set per theme. The meaning never changes:
 * red = the perturbation raises expression, green = it lowers expression,
 * violet = correlation, grey = protein interaction / below threshold.
 * Legends must be built from the same object that the chart is drawn with.
 */
export const networkColors = (p) => {
  const dark = p.mode === "dark";
  return {
    raise: dark ? "#ff6b6b" : "#d62728",
    lower: dark ? "#3ecf7a" : "#1a9641",
    correlation: dark ? "#b39ae8" : "#6a3fd0",
    interaction: dark ? "#8e99a8" : "#7b8794",
    neutral: dark ? "#8e99a8" : "#7b8794",
    // nodes
    hub: dark ? "#ff7b72" : "#d9483b",
    node: dark ? "#f0b429" : "#f29e1f",
    nodeBorder: p.bg,
    focus: dark ? "#ffd166" : "#f29e1f",
    focusBorder: dark ? "#ff6b6b" : "#d62728",
    // node groups around a gene of interest
    upstreamPositive: dark ? "#4da3e0" : "#0072b2",
    upstreamNegative: dark ? "#f0b429" : "#e69f00",
    downstreamPositive: dark ? "#2fc79a" : "#009e73",
    downstreamNegative: dark ? "#e495c1" : "#cc79a7",
    label: p.text,
    halo: p.bg,
    background: p.bg,
  };
};
