import React, { useState } from "react";
import { Popover } from "@mui/material";
import { FaQuestionCircle } from "react-icons/fa";

/** "How to read this plot" texts, by plot kind. */
export const PLOT_HELP = {
  correlationHeatmap: {
    title: "How to read this correlation map",
    points: [
      "Each cell is the correlation between two genes: red means their profiles are similar, blue means opposite.",
      "Rows and columns are ordered by hierarchical clustering, so genes that behave alike sit next to each other and form red blocks along the diagonal.",
      "A red block usually marks a complex or pathway. Click a branch of the tree to select a cluster, then use “Send to…” or run enrichment on it.",
      "The diagonal is always 1 (a gene with itself).",
    ],
  },
  expressionHeatmap: {
    title: "How to read this heatmap",
    points: [
      "Rows are perturbations, columns are measured genes. Colour is the z-scored expression change: red is up, blue is down compared with control cells.",
      "Clustering puts perturbations with similar effects, and genes with similar responses, next to each other.",
      "Colours saturate at the limits of the colour scale; change them in the heatmap settings.",
    ],
  },
  embedding: {
    title: "How to read this map",
    points: [
      "Each point is a gene. Points that are close have similar profiles across the dataset.",
      "Colours are clusters found by HDBSCAN; grey points were not assigned to any cluster.",
      "Distances between far-apart groups are not meaningful in UMAP and t-SNE; PCA axes are, and show the share of variance they explain.",
      "Select a cluster to see its genes, run enrichment, or send it to another module.",
    ],
  },
  signature: {
    title: "How to read this plot",
    points: [
      "Each point is a perturbation; its score is the mean z-score of the “+” genes minus that of the “−” genes of your signature.",
      "High scores: the perturbation switches the signature on. Low scores: it switches it off.",
      "Scores near zero are the bulk of perturbations with no effect on the signature.",
    ],
  },
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 8px",
  border: 0,
  borderRadius: 4,
  background: "none",
  color: "#1565c0",
  fontFamily: "inherit",
  fontSize: 12.5,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/** Small "How to read this" button with a popover. `kind` is a key of PLOT_HELP. */
const PlotHelp = ({ kind, label = "How to read this" }) => {
  const [anchor, setAnchor] = useState(null);
  const help = PLOT_HELP[kind];
  if (!help) return null;
  return (
    <>
      <button type="button" style={buttonStyle} aria-haspopup="dialog" onClick={(event) => setAnchor(event.currentTarget)}>
        <FaQuestionCircle aria-hidden="true" /> {label}
      </button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div style={{ maxWidth: 380, padding: "12px 16px", color: "#1f2733" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{help.title}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
            {help.points.map((point) => (
              <li key={point} style={{ marginBottom: 4 }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </>
  );
};

export { PlotHelp };
