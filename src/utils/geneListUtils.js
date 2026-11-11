/**
 * Helpers for deriving "Top N / Bottom N" gene lists from table rows.
 *
 * The lists are always derived from the score column, never from the order
 * the rows happen to be displayed in, so sorting a table by gene name (or any
 * other column) cannot change what "Top 10" means.
 */

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
};

/**
 * Split rows into positive / negative genes ordered by strength.
 * @returns {{positive: string[], negative: string[]}}
 *   positive: highest score first; negative: most negative score first.
 */
export const splitGenesByScore = (rows, { geneKey = "Gene", scoreKey = "Score" } = {}) => {
  const scored = [];
  (rows || []).forEach((row) => {
    if (!row) return;
    const gene = row[geneKey];
    const score = toNumber(row[scoreKey]);
    if (!gene || !Number.isFinite(score)) return;
    scored.push({ gene, score });
  });

  const positive = scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.gene);
  const negative = scored
    .filter((r) => r.score < 0)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.gene);

  return { positive, negative };
};

/**
 * Build the enrichment gene lists used across the result tables.
 *
 * @param {object[]} rows
 * @param {object} options
 * @param {string} options.geneKey      row key holding the gene symbol
 * @param {string} options.scoreKey     row key holding the numeric score
 * @param {string} options.allPositive  label of the "all positive" list
 * @param {string} options.allNegative  label of the "all negative" list
 * @param {(n:number)=>string} options.topLabel     label of the top-N positive list
 * @param {(n:number)=>string} options.bottomLabel  label of the N most negative list
 * @param {number[]} options.sizes
 * @returns {Object<string,string>} label -> comma separated genes
 */
export const buildTopBottomGeneLists = (
  rows,
  {
    geneKey = "Gene",
    scoreKey = "Score",
    allPositive = "All Positive",
    allNegative = "All Negative",
    topLabel = (n) => `Top ${n} Positive`,
    bottomLabel = (n) => `Bottom ${n} Negative`,
    sizes = [10, 20, 50, 100],
  } = {}
) => {
  const { positive, negative } = splitGenesByScore(rows, { geneKey, scoreKey });
  const lists = {};
  if (allPositive) lists[allPositive] = positive.join();
  if (allNegative) lists[allNegative] = negative.join();
  sizes.forEach((n) => {
    lists[topLabel(n)] = positive.slice(0, n).join();
  });
  sizes.forEach((n) => {
    lists[bottomLabel(n)] = negative.slice(0, n).join();
  });
  return lists;
};

/** Shallow equality of two {label: string} gene-list maps. */
export const geneListsEqual = (a, b) => {
  if (a === b) return true;
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
};

/** Flatten (possibly grouped) table column definitions to leaf columns. */
export const flattenColumns = (columns) =>
  (columns || []).flatMap((col) =>
    Array.isArray(col?.columns) && col.columns.length > 0 ? flattenColumns(col.columns) : [col]
  );

/** Quote a single CSV cell (RFC 4180). */
export const csvCell = (value, separator = ",") => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(separator) || str.includes('"') || /[\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
