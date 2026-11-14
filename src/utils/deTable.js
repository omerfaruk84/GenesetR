/**
 * Reading differential-expression results into a signature
 * ([[gene, value], ...]) for "Project my signature".
 *
 * Understands:
 *  - tables with a header (DESeq2, edgeR, limma, Seurat FindMarkers, ...):
 *    comma, tab or semicolon separated; the gene and value columns are found
 *    by name
 *  - two columns without a header: gene, value
 *  - a plain gene list or a formula "A+B-C": every gene gets +1 ("-" gives -1)
 */

// Preferred value columns, best first: test statistics, then fold changes
const VALUE_COLUMNS = [
  "stat", "t", "wald", "z", "zscore", "z_score", "score",
  "log2foldchange", "logfc", "log2fc", "avg_log2fc", "avg_logfc", "lfc", "log2_fold_change", "foldchange",
];
const GENE_COLUMNS = ["gene", "genes", "symbol", "gene_symbol", "gene_name", "genename", "hgnc_symbol", "external_gene_name", "names", "feature", "id"];
const PADJ_COLUMNS = ["padj", "fdr", "adj.p.val", "p_val_adj", "qvalue", "q_value", "adj_pval", "padjust", "p.adjust"];

const clean = (cell) => String(cell ?? "").trim().replace(/^"|"$/g, "");
const key = (cell) => clean(cell).toLowerCase();
const isNumber = (cell) => clean(cell) !== "" && Number.isFinite(Number(clean(cell)));

const splitLine = (line, delimiter) => (delimiter ? line.split(delimiter) : line.trim().split(/\s+/));

const detectDelimiter = (line) => {
  if (line.includes("\t")) return "\t";
  if (line.includes(",")) return ",";
  if (line.includes(";")) return ";";
  return null; // whitespace
};

/**
 * Parse pasted text or a file's content.
 * Returns { signature, geneColumn, valueColumn, padjColumn, format, skipped }
 * where `format` is "table" | "pairs" | "list"; throws an Error with a
 * message for the user when nothing usable is found.
 * options.maxPadj: keep only rows with adjusted p at or below this (tables
 * that have such a column).
 */
export const parseDeText = (text, { maxPadj = null } = {}) => {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) throw new Error("Nothing to read: paste a table or choose a file.");

  const delimiter = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delimiter).map(clean);
  const second = lines[1] ? splitLine(lines[1], delimiter).map(clean) : [];

  // A gene list or a signature formula: one cell per line or "+"/"-" joined
  const singleColumn = lines.every((line) => splitLine(line, delimiter).filter((c) => clean(c)).length === 1);
  if (singleColumn || (lines.length === 1 && /[+-]/.test(lines[0]) && !isNumber(first[1]))) {
    const signature = [];
    lines.join("+").split(/(?=[+-])|[\s,;]+/).forEach((token) => {
      const sign = token.startsWith("-") ? -1 : 1;
      const gene = token.replace(/^[+-]/, "").trim().toUpperCase();
      if (gene) signature.push([gene, sign]);
    });
    if (signature.length === 0) throw new Error("No gene symbols were found.");
    return { signature, format: "list", geneColumn: null, valueColumn: null, padjColumn: null, skipped: 0 };
  }

  const hasHeader = first.slice(1).every((cell) => !isNumber(cell)) && second.some(isNumber);
  let geneIndex = 0;
  let valueIndex = 1;
  let padjIndex = -1;
  let names = [];
  if (hasHeader) {
    names = first.map(key);
    // R writes row names without a header cell: the header is one cell short
    if (second.length === names.length + 1) names = ["", ...names];
    const find = (candidates) => candidates.map((c) => names.indexOf(c)).find((i) => i >= 0);
    const g = find(GENE_COLUMNS);
    geneIndex = g !== undefined ? g : 0;
    const v = find(VALUE_COLUMNS);
    if (v === undefined) {
      throw new Error(
        "No value column was recognised. Expected a column such as log2FoldChange, logFC, avg_log2FC or stat."
      );
    }
    valueIndex = v;
    const p = find(PADJ_COLUMNS);
    padjIndex = p !== undefined ? p : -1;
  }

  const signature = [];
  let skipped = 0;
  lines.slice(hasHeader ? 1 : 0).forEach((line) => {
    const cells = splitLine(line, delimiter).map(clean);
    const gene = (cells[geneIndex] || "").toUpperCase();
    const value = Number(cells[valueIndex]);
    if (!gene || !isNumber(cells[valueIndex]) || value === 0) {
      skipped += 1;
      return;
    }
    if (maxPadj !== null && padjIndex >= 0) {
      const padj = Number(cells[padjIndex]);
      if (!isNumber(cells[padjIndex]) || padj > maxPadj) {
        skipped += 1;
        return;
      }
    }
    signature.push([gene, value]);
  });

  if (signature.length === 0) throw new Error("No rows with a gene and a numeric value were found.");
  return {
    signature,
    format: hasHeader ? "table" : "pairs",
    geneColumn: hasHeader ? names[geneIndex] || "(row names)" : null,
    valueColumn: hasHeader ? names[valueIndex] : null,
    padjColumn: padjIndex >= 0 ? names[padjIndex] : null,
    skipped,
  };
};
