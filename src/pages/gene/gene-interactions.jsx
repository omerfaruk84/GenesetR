import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGeneInteractions, fetchInteractionDatasets } from "../../store/api/interactions";
import { CLASS_ABOUT, interactionsPath } from "../../utils/interactions";
import styles from "./gene-page.module.scss";

const fmt = (value) => (typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "–");

/**
 * "Genetic interactions" on the gene page: the pairs in which the gene was
 * perturbed together with another gene, with what each pair does compared
 * with the sum of the two genes alone. Renders nothing when the gene is in no
 * such dataset or the request fails.
 */
const GeneInteractions = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [types, setTypes] = useState({}); // { dataset id: perturbation type }

  useEffect(() => {
    setData(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    fetchGeneInteractions(symbol, { signal: controller.signal })
      .then((answer) => {
        if (!controller.signal.aborted) setData(answer.status === "found" ? answer.data : null);
      })
      .catch(() => {});
    fetchInteractionDatasets().then((answer) => {
      if (controller.signal.aborted || answer.status !== "found") return;
      setTypes(Object.fromEntries((answer.data.datasets || []).map((entry) => [entry.id, entry.perturbationType || ""])));
    });
    return () => controller.abort();
  }, [symbol]);

  const datasets = (data?.datasets || []).filter((entry) => (entry.pairs || []).length > 0);
  if (datasets.length === 0) return null;
  const activation = datasets.every((entry) => /crispra|activation/i.test(types[entry.dataset] || ""));

  return (
    <section className={styles.section} data-testid="gene-interactions">
      <h2>Genetic interactions</h2>
      <p className={styles.help}>
        {activation
          ? `${data.symbol} was switched on together with a second gene (CRISPR activation, not a knock-down).`
          : `${data.symbol} was perturbed together with a second gene in the same cells.`}{" "}
        The class says what the pair does compared with the sum of the two genes alone; a magnitude of 1 means as large
        as the sum.
      </p>
      {datasets.map((entry) => (
        <div key={entry.dataset} className={styles.card} style={{ marginTop: 10 }}>
          <div className={styles.openIn} style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>
              {entry.name}{" "}
              <span className={styles.muted}>
                {entry.pairs.length} pair{entry.pairs.length === 1 ? "" : "s"} · {data.symbol} alone: {Number(entry.strongGenes || 0).toLocaleString("en-US")}{" "}
                responding genes, {Number(entry.cells || 0).toLocaleString("en-US")} cells
              </span>
            </h3>
            <Link className={styles.action} to={interactionsPath({ dataset: entry.dataset, q: data.symbol })}>
              Open in Genetic interactions
            </Link>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table} data-testid="gene-interactions-table">
              <thead>
                <tr>
                  <th>Together with</th>
                  <th>Class</th>
                  <th className={styles.num} title="Size of the pair's response divided by the size of the sum of the two single responses">
                    Magnitude
                  </th>
                  <th className={styles.num} title="Share of the pair's response that the two single responses explain">
                    Fit
                  </th>
                  <th className={styles.num} title="Genes whose change in the pair differs from the sum of the two single genes (FDR 5 %)">
                    Genes off the sum
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.pairs.map((pair) => {
                  const partner = pair.a === data.symbol ? pair.b : pair.a;
                  return (
                    <tr key={pair.label} style={{ cursor: "default" }}>
                      <td>
                        <Link
                          className={styles.geneLink}
                          to={interactionsPath({ dataset: entry.dataset, a: pair.a, b: pair.b })}
                          title={`Open the pair ${pair.a} + ${pair.b}`}
                        >
                          {partner}
                        </Link>
                      </td>
                      <td title={CLASS_ABOUT[pair.class]}>
                        {pair.classLabel}
                        {pair.dominant ? ` (${pair.dominant})` : ""}
                      </td>
                      <td className={styles.num}>{fmt(pair.magnitude)}</td>
                      <td className={styles.num}>{fmt(pair.fit)}</td>
                      <td className={styles.num}>{Number(pair.interactionGenes || 0).toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
};

export { GeneInteractions };
