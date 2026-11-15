/**
 * Helpers of the cell-cycle page (pages/cell-cycle). Pure functions, unit-tested
 * in cellCycle.test.js.
 *
 * Evidence per dataset (API: /api/v1/cellcycle, API/utils/cellcycle.py):
 *  - phase calls from single cells: share of a perturbation's cells in G1 / S / G2M,
 *    compared with control cells of the same batches (delta_*, fdr_phase, z_*);
 *  - profile signature for every dataset: mean z of the S and G2/M genes in the
 *    perturbation's profile (sig_*), and as a robust z within the dataset (rz_*).
 */

export const PHASES = [
  { key: "g1", label: "G1" },
  { key: "s", label: "S" },
  { key: "g2m", label: "G2/M" },
];

/** Colours of the three phases (Okabe-Ito blue, orange, green: the first series colours). */
export const phaseColors = (p) => ({ g1: p.series[0], s: p.series[1], g2m: p.series[2] });

export const FDR_CUTOFF = 0.05;

export const METRICS = [
  { key: "delta_g1", label: "Δ G1 share", phase: true, percent: true },
  { key: "delta_s", label: "Δ S share", phase: true, percent: true },
  { key: "delta_g2m", label: "Δ G2/M share", phase: true, percent: true },
  { key: "rz_s", label: "S signature (robust z)", phase: false },
  { key: "rz_g2m", label: "G2/M signature (robust z)", phase: false },
];

export const metricMeta = (key) => METRICS.find((m) => m.key === key) || METRICS[2];

/** Columnar API table -> array of row objects. */
export const tableRows = (table) => {
  if (!table?.columns || !table?.rows) return [];
  const cols = table.columns;
  return table.rows.map((values) => {
    const row = {};
    for (let i = 0; i < cols.length; i += 1) row[cols[i]] = values[i];
    return row;
  });
};

export const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** "+3.2 %" for a share difference given as a fraction. */
export const formatDelta = (v, digits = 1) => {
  if (!isNum(v)) return "–";
  const pct = v * 100;
  const sign = pct > 0.05 ? "+" : pct < -0.05 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(digits)} %`;
};

export const formatPercent = (v, digits = 0) => (isNum(v) ? `${(v * 100).toFixed(digits)} %` : "–");

export const formatFdr = (v) => {
  if (!isNum(v)) return "–";
  if (v < 1e-15) return "< 1e-15"; // below double precision of the test (shown as 0 otherwise)
  if (v < 1e-4) return v.toExponential(0);
  if (v < 0.01) return v.toFixed(4);
  return v.toFixed(2);
};

export const formatZ = (v, digits = 1) => (isNum(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}` : "–");

/** Phase whose share moved most, or null when no row has phase calls. */
export const dominantShift = (row) => {
  if (!row || !isNum(row.delta_g1)) return null;
  let best = null;
  PHASES.forEach(({ key }) => {
    const v = row[`delta_${key}`];
    if (isNum(v) && v > 0 && (!best || v > row[`delta_${best}`])) best = key;
  });
  return best;
};

/** Plain-language verdict for a perturbation with phase calls. */
export const verdict = (row) => {
  if (!row || !isNum(row.delta_g1)) return null;
  const significant = isNum(row.fdr_phase) && row.fdr_phase < FDR_CUTOFF;
  if (!significant) return { tone: "neutral", text: "No significant change in the phase shares" };
  const phase = dominantShift(row);
  const text = {
    g1: "More cells in G1: slower entry into S phase, or a G1 arrest",
    s: "More cells in S: slower DNA replication, or replication stress",
    g2m: "More cells in G2/M: a G2 or mitotic arrest",
  }[phase];
  return { tone: phase || "neutral", text: text || "The phase shares changed" };
};

/**
 * Strongest perturbations per phase: significant ones (FDR < cutoff) with the largest
 * gain in that phase's share and at least `minCells` cells.
 */
export const topHits = (rows, phaseKey, { n = 12, minCells = 0, cutoff = FDR_CUTOFF } = {}) =>
  rows
    .filter(
      (r) =>
        isNum(r[`delta_${phaseKey}`]) &&
        r[`delta_${phaseKey}`] > 0 &&
        isNum(r.fdr_phase) &&
        r.fdr_phase < cutoff &&
        (r.n_cells || 0) >= minCells
    )
    .sort((a, b) => b[`delta_${phaseKey}`] - a[`delta_${phaseKey}`])
    .slice(0, n);

/** Strongest perturbations by the profile signature (datasets without phase calls). */
export const topBySignature = (rows, key, { n = 12, direction = 1 } = {}) =>
  rows
    .filter((r) => isNum(r[key]))
    .sort((a, b) => direction * (b[key] - a[key]))
    .slice(0, n);

/** Filter rows for the table. */
export const filterRows = (rows, { minCells = 0, significantOnly = false, query = "" } = {}) => {
  const q = String(query || "").trim().toUpperCase();
  return rows.filter((r) => {
    if (minCells && isNum(r.n_cells) && r.n_cells < minCells) return false;
    if (significantOnly && !(isNum(r.fdr_phase) && r.fdr_phase < FDR_CUTOFF)) return false;
    if (q && !String(r.target).toUpperCase().includes(q) && !String(r.label || "").toUpperCase().includes(q)) return false;
    return true;
  });
};

/**
 * Consensus table from /compare: one row per perturbation with the mean, the number of
 * datasets and of significant calls, keeping those measured in at least `minDatasets`.
 */
export const consensusRows = (result, { minDatasets = 1 } = {}) => {
  if (!result?.rows) return [];
  return result.rows
    .filter((r) => r.n >= minDatasets)
    .map((r) => ({ ...r }))
    .sort((a, b) => b.n_sig - a.n_sig || Math.abs(b.mean) - Math.abs(a.mean));
};

/** Datasets grouped for the picker: phase calls first, then signature-only, drugs last. */
export const groupDatasets = (datasets = []) => {
  const phase = datasets.filter((d) => d.has_phase);
  const profileGene = datasets.filter((d) => !d.has_phase && d.kind !== "drug");
  const drug = datasets.filter((d) => !d.has_phase && d.kind === "drug");
  return [
    { key: "phase", title: "Phase calls from single cells", items: phase },
    { key: "profile", title: "Profile signature only (no single-cell data)", items: profileGene },
    { key: "drug", title: "Drugs (profile signature only)", items: drug },
  ].filter((g) => g.items.length > 0);
};

/** Read the page state from the address. */
export const readCellCycleQuery = (search) => {
  const params = new URLSearchParams(search || "");
  const view = params.get("view");
  return {
    view: ["dataset", "gene", "compare", "coverage"].includes(view) ? view : null,
    dataset: params.get("dataset") || null,
    gene: (params.get("gene") || "").trim() || null,
    metric: params.get("metric") || null,
  };
};

export const cellCyclePath = ({ view, dataset, gene, metric } = {}) => {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (dataset) params.set("dataset", dataset);
  if (gene) params.set("gene", gene);
  if (metric) params.set("metric", metric);
  const qs = params.toString();
  return `/cell-cycle${qs ? `?${qs}` : ""}`;
};

/** Diverging colour for a value in [-limit, limit] (up = more cells in the phase). */
export const divergingColor = (v, limit, p) => {
  if (!isNum(v)) return "transparent";
  const t = Math.max(-1, Math.min(1, v / (limit || 1)));
  const rgb = t >= 0 ? p.upRgb : p.downRgb;
  return `rgba(${rgb}, ${(Math.abs(t) * 0.85).toFixed(3)})`;
};

/**
 * A perturbation detail (/cellcycle/datasets/{id}/perturbations/{target}) in the shape the
 * Expression Analyzer's cell-cycle panel reads: { target, control, deltas, bins }, with
 * phase_pct as shares. The "control" is what the batch-matched controls predict for this
 * perturbation. Throws when the dataset has no single-cell phase calls.
 */
export const toLegacyComparison = (data) => {
  const t = data?.target || {};
  const c = data?.control || {};
  if (!data?.dataset?.has_phase || !isNum(t.frac_g1)) {
    throw new Error("This dataset has no single-cell data, so no phase calls (the Cell cycle page shows its profile signature)");
  }
  const density = data.density || {};
  const bins = {};
  ["s", "g2m"].forEach((key) => {
    const dt = density.target?.[key];
    const dc = density.control?.[key];
    if (dt?.x?.length) bins[key] = { x: dt.x, density_target: dt.y, density_control: dc?.y || [] };
  });
  const expS = isNum(t.exp_mean_s) ? t.exp_mean_s : c.mean_s;
  const expG = isNum(t.exp_mean_g2m) ? t.exp_mean_g2m : c.mean_g2m;
  return {
    dataset: data.dataset,
    target: { ...t, gene_target: t.target, phase_pct: { g1: t.frac_g1, s: t.frac_s, g2m: t.frac_g2m } },
    control: {
      ...c,
      gene_target: "control cells of the same batches",
      phase_pct: { g1: t.exp_g1, s: t.exp_s, g2m: t.exp_g2m },
      mean_s: expS,
      mean_g2m: expG,
    },
    deltas: {
      delta_mean_s: (t.mean_s ?? 0) - (expS ?? 0),
      delta_mean_g2m: (t.mean_g2m ?? 0) - (expG ?? 0),
      delta_phase_g1: t.delta_g1,
      delta_phase_s: t.delta_s,
      delta_phase_g2m: t.delta_g2m,
    },
    bins,
  };
};

export const TABLE_EXPORT_COLUMNS = [
  { accessorKey: "target", header: "Perturbation" },
  { accessorKey: "n_cells", header: "Cells" },
  { accessorKey: "frac_g1", header: "G1 share" },
  { accessorKey: "frac_s", header: "S share" },
  { accessorKey: "frac_g2m", header: "G2M share" },
  { accessorKey: "exp_g1", header: "G1 share in matched controls" },
  { accessorKey: "exp_s", header: "S share in matched controls" },
  { accessorKey: "exp_g2m", header: "G2M share in matched controls" },
  { accessorKey: "delta_g1", header: "Delta G1" },
  { accessorKey: "delta_s", header: "Delta S" },
  { accessorKey: "delta_g2m", header: "Delta G2M" },
  { accessorKey: "fdr_phase", header: "FDR (phase shares)" },
  { accessorKey: "z_s", header: "S score shift (z)" },
  { accessorKey: "z_g2m", header: "G2M score shift (z)" },
  { accessorKey: "sig_s", header: "S signature (mean z of S genes)" },
  { accessorKey: "sig_g2m", header: "G2M signature (mean z of G2M genes)" },
  { accessorKey: "rz_s", header: "S signature (robust z)" },
  { accessorKey: "rz_g2m", header: "G2M signature (robust z)" },
];
