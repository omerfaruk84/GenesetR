import React from "react";
import { FDR_CUTOFF, formatPercent, groupDatasets, isNum } from "../../utils/cellCycle";
import { PhaseBar, PhaseLegend } from "./parts";
import styles from "./cell-cycle-page.module.scss";

const CoverageView = ({ datasets, onOpen }) => {
  const groups = groupDatasets(datasets);
  const withPhase = datasets.filter((d) => d.has_phase).length;
  return (
    <div className={styles.view} data-testid="cc-coverage-view">
      <div className={styles.datasetHead}>
        <p className={styles.explain} style={{ margin: 0 }}>
          All {datasets.length} datasets have cell-cycle data. {withPhase} come with single-cell counts, so every cell was
          assigned to G1, S or G2/M; the others (pseudobulk or published statistics only) have the cell-cycle signature
          of each profile. Where both exist, the agreement between them is shown (Spearman ρ between the G2/M signature
          and the change in the G2/M share).
        </p>
        <PhaseLegend />
      </div>
      {groups.map((group) => (
        <section key={group.key} className={styles.card}>
          <h3>
            {group.title} <span className={styles.muted}>({group.items.length})</span>
          </h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Cell type</th>
                <th className={styles.num}>{group.key === "drug" ? "Treatments" : "Perturbations"}</th>
                {group.key === "phase" && (
                  <>
                    <th className={styles.num}>Cells</th>
                    <th>Control cells (G1 · S · G2/M)</th>
                    <th className={styles.num}>Changed (FDR &lt; {FDR_CUTOFF})</th>
                    <th className={styles.num}>Profile ~ phase ρ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {group.items.map((d) => (
                <tr key={d.dataset_id} className={styles.clickRow} onClick={() => onOpen(d.dataset_id)}>
                  <td>
                    <button type="button" className={styles.linkButton}>
                      {d.name}
                    </button>
                  </td>
                  <td className={styles.muted}>{d.cell_line}</td>
                  <td className={styles.num}>{(d.n_perturbations || 0).toLocaleString("en-US")}</td>
                  {group.key === "phase" && (
                    <>
                      <td className={styles.num}>{(d.n_cells || 0).toLocaleString("en-US")}</td>
                      <td>
                        <span className={styles.barPair}>
                          <PhaseBar g1={d.control?.g1} s={d.control?.s} g2m={d.control?.g2m} width={110} />
                          <span className={styles.muted}>
                            {formatPercent(d.control?.g1)} · {formatPercent(d.control?.s)} · {formatPercent(d.control?.g2m)}
                          </span>
                        </span>
                      </td>
                      <td className={styles.num}>{(d.n_sig_phase || 0).toLocaleString("en-US")}</td>
                      <td className={styles.num}>
                        {isNum(d.validation?.["sig_g2m~delta_g2m"]) ? d.validation["sig_g2m~delta_g2m"].toFixed(2) : "–"}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section className={styles.card}>
        <h3>Method</h3>
        <ul className={styles.method}>
          <li>
            <strong>Scores.</strong> Every cell gets an S-phase and a G2/M score (Tirosh et al. 2016 genes, as in Seurat):
            mean log-normalised expression of the 43 S or 54 G2/M genes minus that of control genes matched to each of
            them in mean expression.
          </li>
          <li>
            <strong>Phase.</strong> Each cell is also scored on random gene lists matched in expression, which gives the
            noise of a score at the cell&apos;s sequencing depth. A cell is in S or G2/M when its score exceeds 95 % of
            these null scores (the larger one decides), otherwise in G1. Unlike the fixed zero of Seurat&apos;s rule, this
            works for non-cycling cells (iPSC-derived neurons: 92–94 % G1) and at any sequencing depth.
          </li>
          <li>
            <strong>Comparison.</strong> A perturbation is compared with control cells of the same batches (the expected
            shares follow where its cells were sequenced). Chi-square test of the three shares and z-tests of the mean
            scores, calibrated on random groups of control cells of the same sizes, then Benjamini–Hochberg.
          </li>
          <li>
            <strong>Profile signature.</strong> Mean z of the same genes in the perturbation&apos;s profile, with the perturbed
            gene left out, as a robust z within the dataset. Available for every dataset, including drugs.
          </li>
          <li>
            The cells and perturbations are exactly those behind the dataset&apos;s z-score tables.
            Code: <code>Data Analysis/pertseq/cellcycle2.py</code> and <code>API/utils/cellcycle.py</code>.
          </li>
        </ul>
      </section>
    </div>
  );
};

export { CoverageView };
