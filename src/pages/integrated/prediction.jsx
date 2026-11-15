import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { fetchIntegratedPrediction, fetchPredictionBenchmark } from "../../store/api/integrated";
import {
  BENCHMARK_EXPORT_COLUMNS,
  PREDICTION_EXPORT_COLUMNS,
  accuracySentence,
  benchmarkRows,
  predictionChoices,
  predictionExportRows,
} from "../../utils/integrated";
import { Score, plural } from "./parts";
import styles from "./integrated-page.module.scss";

const fmt = (value, digits = 2) => (typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–");
const percent = (value) => (typeof value === "number" && Number.isFinite(value) ? `${Math.round(100 * value)} %` : "–");

const UNTESTED = "Too few knock-downs are shared with other cell contexts to test predictions.";
const NOT_BETTER = "In the held-out test, predictions for this dataset were not clearly better than its mean profile.";

/** The two tables of a prediction: genes predicted to go up and to go down. */
const PredictedTables = ({ prediction, linkTo }) => (
  <div className={styles.pathwayPair}>
    {[
      { key: "up", title: "Predicted to go up" },
      { key: "down", title: "Predicted to go down" },
    ].map((group) => {
      const rows = prediction[group.key] || [];
      return (
        <div key={group.key} className={styles.scroll} data-testid={`integrated-prediction-${group.key}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{group.title}</th>
                <th className={styles.num} title="Predicted z-score in this dataset: a weighted sum of the two columns to the right">
                  Predicted z
                </th>
                <th className={styles.num} title="Mean z-score of this gene over the datasets that did perturb the gene">
                  Mean z elsewhere
                </th>
                <th className={styles.num} title="Datasets with the knock-down that measure this gene">
                  Datasets
                </th>
                <th className={styles.num} title="Mean z-score of this gene, in this dataset, over the knock-downs of the neighbours">
                  Neighbours here
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.muted}>
                    None with a predicted |z| of 0.5 or more
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.gene}>
                  <td>
                    <Link className={styles.geneLink} to={linkTo(row.gene)} title={`What controls ${row.gene} everywhere?`}>
                      {row.gene}
                    </Link>
                  </td>
                  <td className={styles.num}>
                    <Score value={row.predictedZ} limit={6} />
                  </td>
                  <td className={styles.num}>{fmt(row.elsewhereZ)}</td>
                  <td className={styles.num}>{row.datasets ?? "–"}</td>
                  <td className={styles.num}>{fmt(row.neighboursZ)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    })}
  </div>
);

/** Held-out accuracy of every tested dataset, folded away until asked for. */
const BenchmarkTable = ({ benchmark, names, order }) => {
  const rows = benchmarkRows(benchmark, { names, order });
  if (rows.length === 0) return null;
  const top = benchmark?.settings?.topGenes ?? 50;
  const untested = order.filter((id) => !benchmark.datasets[id]).map((id) => names[id] || id);
  return (
    <details className={styles.details} data-testid="integrated-benchmark">
      <summary>How good are the predictions in each dataset?</summary>
      <div className={styles.tableHead}>
        <div className={styles.muted}>
          Knock-downs that a dataset did measure were predicted as if it had not, from the other cell contexts only.{" "}
          <strong>Correlation</strong> is between the predicted and the measured profile (median).{" "}
          <strong>Top {top} confirmed</strong> is the share of the {top} genes predicted to change most that did change
          in that direction. The dataset's mean profile is the baseline that a prediction has to beat; predictions are
          offered only where they clearly do.
        </div>
        <TableExportButtons rows={() => rows} columns={BENCHMARK_EXPORT_COLUMNS} filename="genesetr-integrated-prediction-benchmark" />
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2}>Dataset</th>
              <th rowSpan={2}>Context</th>
              <th rowSpan={2} className={styles.num} title="Held-out knock-downs; those with at least 20 genes at FDR 5 % where the dataset has enough of them">
                Knock-downs
              </th>
              <th colSpan={2} className={styles.groupHead}>
                Correlation
              </th>
              <th colSpan={2} className={styles.groupHead}>
                Top {top} confirmed
              </th>
              <th rowSpan={2}>Predictions</th>
            </tr>
            <tr>
              <th className={styles.num}>Prediction</th>
              <th className={styles.num}>Mean profile</th>
              <th className={styles.num}>Prediction</th>
              <th className={styles.num}>Mean profile</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dataset} data-dataset={row.dataset}>
                <td>{row.name}</td>
                <td>{row.context ? <span className={styles.tag}>{row.context}</span> : "–"}</td>
                <td className={styles.num}>
                  {row.n}
                  {row.strong === "no" ? <span className={styles.muted}> (all)</span> : ""}
                </td>
                <td className={styles.num}>{fmt(row.r)}</td>
                <td className={styles.num}>{fmt(row.baselineR)}</td>
                <td className={styles.num}>{percent(row.hits)}</td>
                <td className={styles.num}>{percent(row.baselineHits)}</td>
                <td>{row.offered === "yes" ? "offered" : <span className={styles.muted}>not offered</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {untested.length > 0 && (
        <div className={styles.muted} style={{ marginTop: 6 }}>
          Not tested, so no predictions: {untested.join(", ")}. {UNTESTED}
        </div>
      )}
    </details>
  );
};

/**
 * "Predicted effect": what the knock-down of a gene is expected to do in a
 * dataset that did not perturb it. The dataset is in the address (`predict`).
 *   data      answer of /integrated/perturbation/{symbol} (its `datasets` perturb the gene)
 *   to        (datasetId) => address with that dataset chosen ("" for none)
 *   linkTo    (gene) => address a listed gene opens
 */
const PredictionSection = ({ symbol, data, summary, names, contextOf, predict, to, linkTo }) => {
  const [benchmark, setBenchmark] = useState(undefined); // undefined while it is asked for, null when it failed
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    let current = true;
    fetchPredictionBenchmark().then((result) => {
      if (current) setBenchmark(result);
    });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    setAnswer(null);
    if (!predict) return undefined;
    const controller = new AbortController();
    fetchIntegratedPrediction(symbol, predict, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol, predict]);

  if (!summary || benchmark === undefined) return null;
  const choices = predictionChoices(summary, data.datasets, benchmark);
  // without the benchmark every dataset can be asked for; the answer says whether a prediction is offered
  const offered = benchmark ? choices.offered : choices.withheld.map((entry) => entry.id);
  const withheld = benchmark ? choices.withheld : [];
  if (offered.length + withheld.length === 0 && !predict) return null;

  const label = (id) => names[id] || id;
  const chip = (id) => (
    <Link
      key={id}
      className={id === predict ? styles.chipActive : styles.chip}
      aria-current={id === predict ? "true" : undefined}
      title={contextOf[id] ? `${label(id)} (${contextOf[id]})` : label(id)}
      to={to(id === predict ? "" : id)}
    >
      {label(id)}
    </Link>
  );

  const prediction = answer?.status === "found" ? answer.data : null;
  const name = label(predict);
  const top = benchmark?.settings?.topGenes ?? 50;
  const sentence = prediction ? accuracySentence(prediction.accuracy, { topGenes: top }) : "";
  const neighbours = prediction?.neighbours || [];
  const genes = prediction ? [...(prediction.up || []), ...(prediction.down || [])].map((row) => row.gene) : [];

  return (
    <div className={`${styles.tableCard} ${styles.block} ${styles.predicted}`} data-testid="integrated-prediction">
      <div className={styles.tableHead}>
        <div>
          <h3>
            Predicted effect where {symbol} was not perturbed
            <span className={`${styles.mark} ${styles.markWarn}`}>prediction, not a measurement</span>
          </h3>
          <div className={styles.muted}>
            What the knock-down of {symbol} is expected to do in a dataset that did not perturb it: what it does in the
            datasets that did, combined with what its closest partners do in the chosen dataset. Offered only for
            datasets where such predictions beat the dataset's mean profile in a held-out test.
          </div>
        </div>
      </div>

      <div className={styles.row} data-testid="integrated-prediction-datasets">
        <span className={styles.muted}>Dataset:</span>
        {offered.length > 0 ? offered.map(chip) : <span className={styles.muted}>none of the datasets without {symbol} has reliable predictions.</span>}
      </div>
      {withheld.length > 0 && (
        <div className={styles.row} data-testid="integrated-prediction-withheld">
          <span className={styles.muted}>No prediction is offered for {plural(withheld.length, "other dataset")} (choose one to see why):</span>
          {withheld.map((entry) => chip(entry.id))}
        </div>
      )}

      {predict && !answer && (
        <div className={styles.status} role="status">
          Predicting {symbol} in {name}…
        </div>
      )}
      {predict && answer && !prediction && (
        <div className={styles.warning} role="alert">
          {answer.status === "error" ? answer.message : `${name} is not a dataset of the integrated analysis.`}
        </div>
      )}
      {prediction?.measured && (
        <div className={styles.warning} role="status" data-testid="integrated-prediction-measured">
          {symbol} was perturbed in {name}, so nothing is predicted: its measured effect is in “Strength per dataset” above.
        </div>
      )}
      {prediction && !prediction.measured && !prediction.reliable && (
        <div className={styles.warning} role="status" data-testid="integrated-prediction-none">
          <strong>No prediction is offered for {name}.</strong> {prediction.reason || (prediction.accuracy ? NOT_BETTER : UNTESTED)} {sentence}
        </div>
      )}
      {prediction && !prediction.measured && prediction.reliable && (
        <div data-testid="integrated-prediction-result">
          <p className={styles.sentence} data-testid="integrated-prediction-accuracy">
            <strong>Predicted for {name}</strong>
            {prediction.context ? ` (${prediction.context})` : ""}. {sentence}
          </p>
          <div className={styles.tableHead}>
            <div className={styles.muted}>
              Based on the knock-down of {symbol} in {plural((prediction.basis || []).length, "dataset")}
              {neighbours.length > 0 ? (
                <>
                  {" "}
                  and on {plural(neighbours.length, "neighbour")}, the knock-downs most similar to {symbol} that {name}{" "}
                  did measure:{" "}
                  {neighbours.map((row, index) => (
                    <React.Fragment key={row.symbol}>
                      {index > 0 ? ", " : ""}
                      <span title={`Mean correlation with ${symbol} ${fmt(row.r, 3)}; evidence score ${fmt(row.score, 1)}`}>{row.symbol}</span>
                    </React.Fragment>
                  ))}
                  .
                </>
              ) : (
                `. No close partner of ${symbol} was perturbed in ${name}, so the prediction rests on the other datasets alone.`
              )}{" "}
              Predicted z = {fmt(prediction.coefficients?.transfer)} × mean z elsewhere
              {neighbours.length > 0 ? ` + ${fmt(prediction.coefficients?.neighbours)} × mean z of the neighbours here` : ""}; the weights
              were fitted on knock-downs that {name} did measure.
              {prediction.expressed === false ? ` ${symbol} is not among the genes measured in ${name}: if it is not expressed there, expect no effect, whatever is predicted.` : ""}
            </div>
            {genes.length > 0 && (
              <div className={styles.headActions}>
                <SendToMenu genes={genes} label="Send the genes to…" defaultName={`Integrated: predicted for ${symbol} in ${predict}`} drugs={false} />
                <TableExportButtons
                  rows={() => predictionExportRows(prediction)}
                  columns={PREDICTION_EXPORT_COLUMNS}
                  filename={`genesetr-integrated-prediction-${symbol}-in-${predict}`}
                />
              </div>
            )}
          </div>
          <PredictedTables prediction={prediction} linkTo={linkTo} />
        </div>
      )}
      {!predict && offered.length > 0 && <div className={styles.muted} style={{ marginTop: 8 }}>Choose a dataset to see the prediction.</div>}

      {benchmark && <BenchmarkTable benchmark={benchmark} names={names} order={summary.datasets || []} />}
    </div>
  );
};

export { PredictionSection };
