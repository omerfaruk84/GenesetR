/**
 * Filtering of the dataset list, shared by the dataset catalog and the dataset
 * selector in the sidebar. Datasets come from the registry on the server
 * (API/datasets.json) plus the user's own uploads.
 */

import { isDrugDataset } from "./perturbationKind";

// "genetic" and "chemical" say what was perturbed (genes or drugs); "genome"
// and "focused" are the two scopes of the genetic screens.
export const DATASET_KINDS = [
  { id: "all", label: "All" },
  { id: "genetic", label: "Genetic" },
  { id: "chemical", label: "Chemical" },
  { id: "genome", label: "Genome-wide" },
  { id: "focused", label: "Focused" },
  { id: "mine", label: "My uploads" },
];

export const datasetKind = (dataset) => {
  if (dataset?.isUserUploaded) return "mine";
  if (isDrugDataset(dataset)) return "chemical";
  return dataset?.isWholeGenome ? "genome" : "focused";
};

/** True when the dataset belongs under the chip `kind` of DATASET_KINDS. */
export const datasetHasKind = (dataset, kind) => {
  if (!kind || kind === "all") return true;
  if (kind === "genetic") return !isDrugDataset(dataset);
  return datasetKind(dataset) === kind;
};

/** Distinct non-empty values of `field` with their counts, most frequent first. */
export const facetValues = (datasets, field) => {
  const counts = new Map();
  (datasets || []).forEach((dataset) => {
    const value = dataset?.[field];
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([value, count]) => ({ value, count }));
};

/**
 * True when the dataset passes the filters.
 * filters: { text, kind, cellLine, perturbationType } - empty values match all.
 */
export const datasetMatches = (dataset, filters = {}) => {
  const { text, kind, cellLine, perturbationType } = filters;
  if (!datasetHasKind(dataset, kind)) return false;
  if (cellLine && dataset?.cellLine !== cellLine) return false;
  if (perturbationType && dataset?.perturbationType !== perturbationType) return false;
  const words = String(text || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    dataset?.id,
    dataset?.name,
    dataset?.description,
    dataset?.cellLine,
    dataset?.perturbationType,
    dataset?.citation,
    dataset?.organ,
    dataset?.collection,
    isDrugDataset(dataset) ? "drug chemical" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
};
