import React, { useMemo, useState } from "react";
import { Panel, uiStyles } from "../ui";
import { TableExportButtons } from "../export-buttons";
import { formatP } from "../../utils/geneSetOverlap";
import styles from "./genelist-compare-page.module.scss";

const METRICS = [
  // Square-root scales: similarities between gene lists are mostly small
  { id: "jaccard", label: "Jaccard index", format: (p) => p.jaccard.toFixed(2), scale: (p) => Math.sqrt(p.jaccard) },
  { id: "overlap", label: "Shared genes", format: (p) => p.overlap.toLocaleString(), scale: (p, max) => (max ? Math.sqrt(p.overlap / max) : 0) },
  { id: "coef", label: "Overlap coefficient", format: (p) => p.overlapCoefficient.toFixed(2), scale: (p) => Math.sqrt(p.overlapCoefficient) },
  {
    id: "q",
    label: "−log₁₀ q (enrichment)",
    format: (p) => (Number.isFinite(p.qValue) ? Math.min(300, -Math.log10(Math.max(p.qValue, 1e-300))).toFixed(1) : "–"),
    scale: (p) => Math.min(1, -Math.log10(Math.max(p.qValue, 1e-300)) / 20),
  },
];

const EXPORT_COLUMNS = [
  { accessorKey: "a", header: "List A" },
  { accessorKey: "b", header: "List B" },
  { accessorKey: "sizeA", header: "Size A" },
  { accessorKey: "sizeB", header: "Size B" },
  { accessorKey: "overlap", header: "Shared genes" },
  { accessorFn: (r) => Number(r.expected.toPrecision(4)), accessorKey: "expected", header: "Expected" },
  { accessorFn: (r) => (Number.isFinite(r.foldEnrichment) ? Number(r.foldEnrichment.toPrecision(4)) : ""), accessorKey: "fold", header: "Fold enrichment" },
  { accessorFn: (r) => Number(r.jaccard.toFixed(4)), accessorKey: "jaccard", header: "Jaccard" },
  { accessorFn: (r) => Number(r.overlapCoefficient.toFixed(4)), accessorKey: "coef", header: "Overlap coefficient" },
  { accessorFn: (r) => r.pValue, accessorKey: "pValue", header: "P (hypergeometric)" },
  { accessorFn: (r) => r.qValue, accessorKey: "qValue", header: "Q (BH)" },
  { accessorFn: (r) => r.genes.join(";"), accessorKey: "genes", header: "Shared gene symbols" },
];

/**
 * Pairwise similarity of the selected lists: a matrix coloured by the chosen
 * metric and a table with the hypergeometric test of every pair.
 */
const SimilarityMatrix = ({ lists, colors, overlaps, background, onBackgroundChange, onSelectPair, activeKey, highlightRgb }) => {
  const [metricId, setMetricId] = useState("jaccard");
  const [draftBackground, setDraftBackground] = useState(String(background));
  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];

  const byPair = useMemo(() => {
    const map = new Map();
    overlaps.pairs.forEach((p) => {
      map.set(`${p.a}\u0000${p.b}`, p);
      map.set(`${p.b}\u0000${p.a}`, p);
    });
    return map;
  }, [overlaps]);
  const maxOverlap = Math.max(0, ...overlaps.pairs.map((p) => p.overlap));
  const sortedPairs = useMemo(() => [...overlaps.pairs].sort((x, y) => x.pValue - y.pValue || y.overlap - x.overlap), [overlaps]);

  const commitBackground = () => {
    const n = Math.round(Number(draftBackground));
    if (Number.isFinite(n) && n > 0) onBackgroundChange(n);
    else setDraftBackground(String(background));
  };

  const names = lists.map((l) => l.name);
  const pairKey = (p) => `pair:${p.a}\u0000${p.b}`;

  return (
    <Panel
      title="Pairwise similarity"
      subtitle={`hypergeometric test, ${overlaps.background.toLocaleString()} genes in the universe`}
      data-testid="genelist-similarity"
      actions={
        <>
          <select className={styles.select} value={metricId} onChange={(e) => setMetricId(e.target.value)} aria-label="Matrix metric">
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <label className={styles.inlineField} title="Number of genes the lists could have been drawn from (e.g. all measured genes); used for the expected overlap and P values">
            Universe
            <input
              type="number"
              min={1}
              step={100}
              value={draftBackground}
              onChange={(e) => setDraftBackground(e.target.value)}
              onBlur={commitBackground}
              onKeyDown={(e) => e.key === "Enter" && commitBackground()}
            />
          </label>
        </>
      }
    >
      <div className={styles.matrixLayout}>
        <div className={styles.matrixScroll}>
          <table className={styles.matrix} aria-label={`${metric.label} between lists`}>
            <thead>
              <tr>
                <th />
                {names.map((n) => (
                  <th key={n} scope="col" title={n}>
                    <span className={styles.matrixColHead}>
                      <span className={styles.swatch} style={{ background: colors[n] }} />
                      {n}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lists.map((row) => (
                <tr key={row.name}>
                  <th scope="row" title={row.name}>
                    <span className={styles.swatch} style={{ background: colors[row.name] }} />
                    <span className={styles.matrixRowHead}>{row.name}</span>
                  </th>
                  {lists.map((col) => {
                    if (row.name === col.name) {
                      return (
                        <td key={col.name} className={styles.matrixDiag} title={`${row.name}: ${row.genes.length} genes`}>
                          {row.genes.length.toLocaleString()}
                        </td>
                      );
                    }
                    const p = byPair.get(`${row.name}\u0000${col.name}`);
                    if (!p) return <td key={col.name} />;
                    const strength = Math.max(0, Math.min(1, metric.scale(p, maxOverlap)));
                    const active = activeKey === pairKey(p);
                    return (
                      <td key={col.name} className={styles.matrixCell}>
                        <button
                          type="button"
                          className={active ? styles.matrixActive : undefined}
                          style={{
                            background: `rgba(${highlightRgb}, ${0.08 + strength * 0.72})`,
                            color: strength > 0.55 ? "#fff" : undefined,
                          }}
                          onClick={() => onSelectPair(p, pairKey(p))}
                          title={`${p.a} ∩ ${p.b}\n${p.overlap} shared (expected ${p.expected.toFixed(1)})\nJaccard ${p.jaccard.toFixed(3)}\nP ${formatP(p.pValue)}, q ${formatP(p.qValue)}\nClick to list the shared genes`}
                        >
                          {metric.format(p)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.matrixNote}>Diagonal: list size. Click a cell to list the genes the two lists share.</div>
        </div>

        <div className={styles.pairTableWrap}>
          <div className={`${uiStyles.tableScroll} ${styles.pairScroll}`}>
            <table className={uiStyles.table}>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th className={uiStyles.num}>Shared</th>
                  <th className={uiStyles.num} title="Overlap expected by chance">Expected</th>
                  <th className={uiStyles.num}>Fold</th>
                  <th className={uiStyles.num}>Jaccard</th>
                  <th className={uiStyles.num} title="Benjamini–Hochberg adjusted hypergeometric P">q</th>
                </tr>
              </thead>
              <tbody>
                {sortedPairs.map((p) => (
                  <tr
                    key={pairKey(p)}
                    className={`${styles.clickableRow} ${activeKey === pairKey(p) ? styles.rowSelected : ""}`}
                    onClick={() => onSelectPair(p, pairKey(p))}
                  >
                    <td className={styles.pairName}>
                      {p.a} <span className={uiStyles.muted}>∩</span> {p.b}
                    </td>
                    <td className={uiStyles.num}>{p.overlap.toLocaleString()}</td>
                    <td className={uiStyles.num}>{p.expected < 10 ? p.expected.toFixed(2) : p.expected.toFixed(0)}</td>
                    <td className={uiStyles.num}>{Number.isFinite(p.foldEnrichment) ? `${p.foldEnrichment.toFixed(1)}×` : "–"}</td>
                    <td className={uiStyles.num}>{p.jaccard.toFixed(2)}</td>
                    <td className={`${uiStyles.num} ${p.qValue < 0.05 ? styles.significant : ""}`}>{formatP(p.qValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pairFoot}>
            <TableExportButtons rows={sortedPairs} columns={EXPORT_COLUMNS} filename="genelist-pairwise-overlap" />
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default SimilarityMatrix;
