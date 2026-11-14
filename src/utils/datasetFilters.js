/**
 * Filtering of the dataset list, shared by the dataset catalog and the dataset
 * selector in the sidebar. Datasets come from the registry on the server
 * (API/datasets.json) plus the user's own uploads.
 */

export const DATASET_KINDS = [
  { id: "all", label: "All" },
  { id: "genome", label: "Genome-wide" },
  { id: "focused", label: "Focused" },
  { id: "mine", label: "My uploads" },
];

export const datasetKind = (dataset) => {
  if (dataset?.isUserUploaded) return "mine";
  return dataset?.isWholeGenome ? "genome" : "focused";
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
  if (kind && kind !== "all" && datasetKind(dataset) !== kind) return false;
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
};
