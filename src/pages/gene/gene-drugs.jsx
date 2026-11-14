import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDrugsForGene } from "../../store/api/drugs";
import { drugPagePath } from "../../utils/perturbationKind";
import styles from "./gene-page.module.scss";

const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

const divergingColor = (value, limit) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "transparent";
  const t = Math.max(-1, Math.min(1, value / limit));
  const alpha = Math.abs(t) * 0.85;
  return t >= 0 ? `rgba(200, 55, 60, ${alpha})` : `rgba(45, 105, 190, ${alpha})`;
};

/** Ranked drugs ({ drug, [valueKey] }) with a small value bar. */
const DrugList = ({ title, rows, valueKey, limit, names, digits = 2 }) => (
  <div className={styles.ranked}>
    <div className={styles.rankedTitle}>{title}</div>
    {!rows || rows.length === 0 ? (
      <div className={styles.muted}>None</div>
    ) : (
      <ol className={styles.rankedList}>
        {rows.map((row) => (
          <li key={row.drug} className={styles.rankedRow}>
            <Link className={styles.geneLink} to={drugPagePath(row.drug)} title={`Open the drug page of ${names[row.drug] || row.drug}`}>
              {names[row.drug] || row.drug}
            </Link>
            <span className={styles.value} style={{ background: divergingColor(row[valueKey], limit) }}>
              {fmt(row[valueKey], digits)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

/**
 * "Drugs" section of the gene page: drugs annotated to target the gene, drugs
 * that change its expression, and drugs whose profile looks like (or opposite
 * to) the knock-down of the gene. Renders nothing when the drug screen has
 * nothing on the gene or cannot be reached.
 */
const GeneDrugs = ({ symbol, datasetNames = {} }) => {
  const [data, setData] = useState(null);
  const [dataset, setDataset] = useState(null);

  useEffect(() => {
    setData(null);
    setDataset(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    fetchDrugsForGene(symbol, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || !result || result.available !== true) return;
      setData(result);
      setDataset(result.connectivity?.[0]?.dataset || null);
    });
    return () => controller.abort();
  }, [symbol]);

  if (!data) return null;

  const names = data.names || {};
  const targeting = data.targeting || [];
  const expression = data.expression || {};
  const connectivity = data.connectivity || [];
  const current = connectivity.find((entry) => entry.dataset === dataset) || null;
  const hasExpression = expression.measured && ((expression.up || []).length > 0 || (expression.down || []).length > 0);
  if (targeting.length === 0 && !hasExpression && connectivity.length === 0) return null;

  return (
    <section className={styles.section} data-testid="gene-drugs">
      <h2>Drugs</h2>
      <p className={styles.help}>
        From the Tahoe-100M drug screen (379 small molecules in 47 cancer cell lines). Drug names open the drug page.
      </p>
      <div className={styles.columns}>
        <div className={styles.card}>
          <h3>Drugs annotated to target {symbol}</h3>
          {targeting.length === 0 ? (
            <p className={styles.muted}>No drug of the screen is annotated with {symbol} as a target.</p>
          ) : (
            <ul className={styles.rankedList}>
              {targeting.map((drug) => (
                <li key={drug.id} className={styles.rankedRow}>
                  <Link className={styles.geneLink} to={drugPagePath(drug.id)}>
                    {drug.name || drug.id}
                  </Link>
                  <span className={styles.muted}>
                    {drug.moaFine && drug.moaFine !== "unclear" ? drug.moaFine : ""}
                    {drug.approved ? " · approved" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h3>Drugs that change {symbol} expression</h3>
          {hasExpression ? (
            <>
              <p className={styles.help}>z-score of {symbol} under each drug, pooled over cell lines and doses.</p>
              <div className={styles.pair}>
                <DrugList title="Raise it" rows={expression.up} valueKey="z" limit={10} names={names} digits={1} />
                <DrugList title="Lower it" rows={expression.down} valueKey="z" limit={10} names={names} digits={1} />
              </div>
            </>
          ) : (
            <p className={styles.muted}>{symbol} is not among the genes measured in the drug screen.</p>
          )}
        </div>

        <div className={styles.card}>
          <h3>Drugs that act like the knock-down of {symbol}</h3>
          {connectivity.length === 0 ? (
            <p className={styles.muted}>{symbol} is not knocked down in a dataset that can be compared with the drug screen.</p>
          ) : (
            <>
              <p className={styles.help}>
                Correlation between each drug's profile and the knock-down profile of {symbol}. A high score is a
                hypothesis, not evidence that the drug targets {symbol}.
              </p>
              {connectivity.length > 1 && (
                <div className={styles.datasetChips} role="tablist" aria-label="Knock-down dataset">
                  {connectivity.map((entry) => (
                    <button
                      key={entry.dataset}
                      type="button"
                      role="tab"
                      aria-selected={entry.dataset === dataset}
                      className={`${styles.chip} ${entry.dataset === dataset ? styles.chipActive : ""}`}
                      onClick={() => setDataset(entry.dataset)}
                    >
                      {datasetNames[entry.dataset] || entry.dataset}
                    </button>
                  ))}
                </div>
              )}
              {current && (
                <div className={styles.pair}>
                  <DrugList title="Mimic the knock-down" rows={current.mimic} valueKey="r" limit={0.5} names={names} />
                  <DrugList title="Reverse the knock-down" rows={current.reverse} valueKey="r" limit={0.5} names={names} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export { GeneDrugs };
