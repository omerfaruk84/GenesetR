/**
 * Significance of gene-signature scores (`significance` of the API's
 * calcGeneSignature result): the z of every perturbation's score against
 * random gene sets of the same size drawn from the same profile, and its
 * q-value over the perturbations. Pure helpers for the gene signature page.
 */

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** Keys of the two columns in the single-dataset table and its exports. */
export const RANDOM_Z_KEY = "z vs random sets";
export const Q_KEY = "q";

/**
 * The two table cells of the perturbation at `index` of a single-dataset
 * result: { "z vs random sets": 4.2, q: 0.003 }. Empty when the result has
 * no significance; a missing value is null, so the row still has the keys.
 */
export const significanceAt = (significance, index) => {
  if (!Array.isArray(significance?.z)) return {};
  const z = significance.z[index];
  const q = Array.isArray(significance.q) ? significance.q[index] : null;
  return { [RANDOM_Z_KEY]: isNumber(z) ? z : null, [Q_KEY]: isNumber(q) ? q : null };
};

/**
 * { datasetId: { perturbation: z } } from the cached single-dataset results
 * ({ datasetId: { genes, significance: { z } } }): the shape of `significance`
 * in the multi-dataset result of the API. Datasets without significance are left out.
 */
export const multiSignificance = (datasets, cache) => {
  const out = {};
  (datasets || []).forEach((id) => {
    const entry = cache?.[id];
    const genes = entry?.genes;
    const z = entry?.significance?.z;
    if (!Array.isArray(genes) || !Array.isArray(z) || genes.length !== z.length) return;
    const map = {};
    genes.forEach((gene, i) => {
      if (isNumber(z[i])) map[gene] = z[i];
    });
    out[id] = map;
  });
  return out;
};

/** Tooltip of a score in the multi-dataset table: "z against random gene sets: 4.20"; "" without a z. */
export const significanceTitle = (z) => (isNumber(z) ? `z against random gene sets: ${z.toFixed(2)}` : "");

/** One sentence on what the z means; `genesUsed` is the number of signature genes found in the dataset. */
export const SIGNIFICANCE_NOTE = (genesUsed) =>
  `“z vs random sets” measures the score of a perturbation against random gene sets of the same size${
    isNumber(genesUsed) ? ` (${genesUsed} genes)` : ""
  } taken from that perturbation's own profile, and q is its false discovery rate over all perturbations: ` +
  "a perturbation that shifts many genes at once needs a larger score to stand out.";
