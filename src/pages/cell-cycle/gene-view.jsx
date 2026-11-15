import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GeneSearch } from "../../components/gene-search";
import { TableExportButtons } from "../../components/export-buttons";
import { useChartTheme } from "../../utils/chartTheme";
import { genePagePath } from "../../utils/geneLinks";
import { FDR_CUTOFF, PHASES, formatFdr, formatZ, isNum, verdict } from "../../utils/cellCycle";
import { fetchCellCycleGene } from "../../store/api/cellcycle";
import { densityOption, geneAcrossOption } from "./charts";
import { Chart, Delta, PhaseBar, PhaseLegend } from "./parts";
import styles from "./cell-cycle-page.module.scss";

const EXAMPLES = ["CDK1", "PLK1", "CCND1", "CDC20", "WEE1", "MCM2"];

const exportColumns = [
  { accessorKey: "dataset", header: "Dataset" },
  { accessorKey: "cells", header: "Cells" },
  { accessorKey: "delta_g1", header: "Delta G1" },
  { accessorKey: "delta_s", header: "Delta S" },
  { accessorKey: "delta_g2m", header: "Delta G2M" },
  { accessorKey: "fdr", header: "FDR (phase shares)" },
  { accessorKey: "rz_s", header: "S signature (robust z)" },
  { accessorKey: "rz_g2m", header: "G2M signature (robust z)" },
];

const GeneView = ({ gene, onGene }) => {
  const chart = useChartTheme();
  const [state, setState] = useState({ status: gene ? "loading" : "idle" });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!gene) {
      setState({ status: "idle" });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    setOpen(null);
    fetchCellCycleGene(gene, { signal: controller.signal })
      .then((data) => !controller.signal.aborted && setState({ status: "done", data }))
      .catch((err) => !controller.signal.aborted && setState({ status: "error", error: err.message }));
    return () => controller.abort();
  }, [gene]);

  const items = state.data?.datasets || [];
  const phaseItems = items.filter((i) => i.has_phase && isNum(i.values?.frac_g1));
  const profileItems = items.filter((i) => !(i.has_phase && isNum(i.values?.frac_g1)));
  const nSig = phaseItems.filter((i) => isNum(i.values.fdr_phase) && i.values.fdr_phase < FDR_CUTOFF).length;

  const consensus = useMemo(() => {
    const sig = phaseItems.filter((i) => isNum(i.values.fdr_phase) && i.values.fdr_phase < FDR_CUTOFF);
    if (!sig.length) return null;
    const counts = { g1: 0, s: 0, g2m: 0 };
    sig.forEach((i) => {
      const best = PHASES.map((ph) => ph.key).reduce((a, b) => (i.values[`delta_${b}`] > i.values[`delta_${a}`] ? b : a));
      counts[best] += 1;
    });
    return counts;
  }, [phaseItems]);

  const exportRows = () =>
    items.map((i) => ({
      dataset: i.name,
      cells: i.values.n_cells,
      delta_g1: i.values.delta_g1,
      delta_s: i.values.delta_s,
      delta_g2m: i.values.delta_g2m,
      fdr: i.values.fdr_phase,
      rz_s: i.values.rz_s,
      rz_g2m: i.values.rz_g2m,
    }));

  return (
    <div className={styles.view} data-testid="cc-gene-view">
      <div className={styles.geneSearchRow}>
        <div className={styles.geneSearchBox}>
          <GeneSearch placeholder="Perturbed gene, e.g. CDK1" initialValue={gene || ""} onSelect={onGene} />
        </div>
        <span className={styles.muted}>Examples:</span>
        {EXAMPLES.map((g) => (
          <button key={g} type="button" className={styles.chip} onClick={() => onGene(g)}>
            {g}
          </button>
        ))}
      </div>

      {state.status === "idle" && (
        <p className={styles.explain}>
          Pick a gene to see what knocking it down (or overexpressing it) does to the cell cycle in every genetic
          dataset that perturbs it: the change in the share of cells in each phase, where single cells were scored, and
          the cell-cycle signature of its profile everywhere else.
        </p>
      )}
      {state.status === "loading" && <div className={styles.status}>Looking up {gene} in every dataset…</div>}
      {state.status === "error" && <div className={styles.status} role="alert">{state.error}</div>}

      {state.status === "done" && (
        <>
          <div className={styles.datasetHead}>
            <div>
              <h2>
                {state.data.symbol} <Link className={styles.small} to={genePagePath(state.data.symbol)}>gene page</Link>
              </h2>
              <div className={styles.muted} data-testid="cc-gene-summary">
                Perturbed in {items.length} dataset{items.length === 1 ? "" : "s"}
                {phaseItems.length ? `; phase calls in ${phaseItems.length}, changed (FDR < ${FDR_CUTOFF}) in ${nSig}` : ""}.
                {consensus && nSig > 0
                  ? ` Most often more cells in ${
                      PHASES.find((ph) => ph.key === Object.keys(consensus).reduce((a, b) => (consensus[b] > consensus[a] ? b : a))).label
                    }.`
                  : ""}
              </div>
            </div>
            <div className={styles.headActions}>
              <PhaseLegend />
              {items.length > 0 && (
                <TableExportButtons rows={exportRows} columns={exportColumns} filename={`genesetr-cell-cycle-${state.data.symbol}`} />
              )}
            </div>
          </div>

          {items.length === 0 && (
            <div className={styles.status}>{state.data.symbol} is not perturbed in any dataset with cell-cycle data.</div>
          )}

          {phaseItems.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h3>Change in phase shares</h3>
                  <span className={styles.muted}>
                    Percentage points against control cells of the same batches. ● marks datasets where the change is
                    significant (FDR &lt; {FDR_CUTOFF}).
                  </span>
                </div>
              </div>
              <Chart option={geneAcrossOption(items, chart.p)} height={Math.max(180, 40 + phaseItems.length * 34)} testId="cc-gene-chart" />
            </section>
          )}

          {phaseItems.length > 0 && (
            <section className={styles.card}>
              <h3>Datasets with single-cell phase calls</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th className={styles.num}>Cells</th>
                    <th>Controls → perturbation</th>
                    {PHASES.map((ph) => (
                      <th key={ph.key} className={styles.num}>
                        Δ {ph.label}
                      </th>
                    ))}
                    <th className={styles.num}>FDR</th>
                    <th>Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseItems.map((i) => {
                    const v = i.values;
                    const isOpen = open === i.dataset_id;
                    return (
                      <React.Fragment key={i.dataset_id}>
                        <tr className={styles.clickRow} onClick={() => setOpen(isOpen ? null : i.dataset_id)}>
                          <td>
                            <span className={styles.caret}>{isOpen ? "▾" : "▸"}</span> {i.name}
                            <div className={styles.muted}>{i.cell_line}</div>
                          </td>
                          <td className={styles.num}>{v.n_cells?.toLocaleString("en-US")}</td>
                          <td>
                            <div className={styles.barPair}>
                              <PhaseBar g1={v.exp_g1} s={v.exp_s} g2m={v.exp_g2m} width={90} />
                              <PhaseBar g1={v.frac_g1} s={v.frac_s} g2m={v.frac_g2m} width={90} />
                            </div>
                          </td>
                          {PHASES.map((ph) => (
                            <td key={ph.key} className={styles.num}>
                              <Delta value={v[`delta_${ph.key}`]} />
                            </td>
                          ))}
                          <td className={`${styles.num} ${isNum(v.fdr_phase) && v.fdr_phase < FDR_CUTOFF ? styles.strong : styles.muted}`}>
                            {formatFdr(v.fdr_phase)}
                          </td>
                          <td className={styles.muted}>{verdict(v)?.text}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8}>
                              <div className={styles.densityPair}>
                                <Chart option={densityOption(i.density, "s", chart.p, `S-phase score, ${i.name}`)} height={170} />
                                <Chart option={densityOption(i.density, "g2m", chart.p, `G2/M score, ${i.name}`)} height={170} />
                              </div>
                              <div className={styles.muted}>
                                Coloured above the line: cells with {state.data.symbol} perturbed; grey below: control cells.
                                Score shift S {formatZ(v.z_s)}, G2/M {formatZ(v.z_g2m)} (z).
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {profileItems.length > 0 && (
            <section className={styles.card}>
              <h3>Profile signature only</h3>
              <p className={styles.muted}>
                These datasets have no single-cell data. The signature is the mean change of the S-phase and G2/M genes in
                the profile, as a robust z within the dataset (|z| ≥ 3 stands out).
              </p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th className={styles.num}>S signature</th>
                    <th className={styles.num}>G2/M signature</th>
                  </tr>
                </thead>
                <tbody>
                  {profileItems.map((i) => (
                    <tr key={i.dataset_id}>
                      <td>
                        {i.name}
                        <div className={styles.muted}>{i.cell_line}</div>
                      </td>
                      {["rz_s", "rz_g2m"].map((k) => (
                        <td key={k} className={`${styles.num} ${Math.abs(i.values[k] || 0) >= 3 ? styles.strong : ""}`}>
                          {formatZ(i.values[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export { GeneView };
