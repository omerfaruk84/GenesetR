import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConsensusTable } from "../../components/regulator-table/consensus-table";
import { fetchIntegratedGene, fetchIntegratedPerturbation, fetchIntegratedSummary } from "../../store/api/integrated";
import { coverageText, datasetContexts, integratedPath } from "../../utils/integrated";
import styles from "./gene-page.module.scss";

const TOP = 5;

/**
 * "Across all datasets (consensus)" on the gene page: the strongest consensus
 * targets of the gene (when it is perturbed) and its strongest consensus
 * regulators (when it is measured), over all loss-of-function datasets.
 * Renders nothing when the gene is on neither side or the requests fail.
 */
const GeneConsensus = ({ symbol, datasetNames = {} }) => {
  const [data, setData] = useState(null);
  const [contextOf, setContextOf] = useState({});

  useEffect(() => {
    setData(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    const options = { topN: TOP, signal: controller.signal };
    Promise.all([fetchIntegratedPerturbation(symbol, options), fetchIntegratedGene(symbol, options), fetchIntegratedSummary()])
      .then(([perturbation, measured, summary]) => {
        if (controller.signal.aborted) return;
        setContextOf(datasetContexts(summary));
        setData({
          perturbation: perturbation.status === "found" ? perturbation.data : null,
          measured: measured.status === "found" ? measured.data : null,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol]);

  if (!data || (!data.perturbation && !data.measured)) return null;
  const { perturbation, measured } = data;
  const asMeasured = (name) => integratedPath({ mode: "gene", symbol: name, view: "measured" });
  const asPerturbation = (name) => integratedPath({ mode: "gene", symbol: name, view: "perturbation" });
  const table = { compact: true, names: datasetNames, contextOf };

  return (
    <section className={styles.section} data-testid="gene-consensus">
      <h2>Across all datasets (consensus)</h2>
      <p className={styles.help}>
        All knock-down and knock-out datasets combined: meta z is the sum of the z-scores of the datasets that have
        the pair, divided by the square root of their number. “Contexts” counts the distinct cell types that show the
        effect on their own, of those that have the pair.{" "}
        {[perturbation && coverageText("Perturbed", perturbation), measured && coverageText("measured", measured)]
          .filter(Boolean)
          .join("; ")}
        . Open a row for the value in each dataset.
      </p>
      <div className={styles.openIn}>
        <Link className={styles.action} to={integratedPath({ mode: "gene", symbol, view: perturbation ? "perturbation" : "measured" })}>
          Open the integrated view
        </Link>
      </div>
      <div className={styles.columns}>
        {perturbation && (
          <>
            <div className={styles.card}>
              <h3>Go up when {symbol} is knocked down</h3>
              <ConsensusTable {...table} rows={(perturbation.targets?.up || []).slice(0, TOP)} nameHeader="Gene" linkTo={asMeasured} />
            </div>
            <div className={styles.card}>
              <h3>Go down when {symbol} is knocked down</h3>
              <ConsensusTable {...table} rows={(perturbation.targets?.down || []).slice(0, TOP)} nameHeader="Gene" linkTo={asMeasured} />
            </div>
          </>
        )}
        {measured && (
          <>
            <div className={styles.card}>
              <h3>Needed for {symbol}: knock-down lowers it</h3>
              <ConsensusTable
                {...table}
                rows={(measured.regulators?.down || []).slice(0, TOP)}
                nameHeader="Perturbed gene"
                linkTo={asPerturbation}
              />
            </div>
            <div className={styles.card}>
              <h3>Hold {symbol} down: knock-down raises it</h3>
              <ConsensusTable
                {...table}
                rows={(measured.regulators?.up || []).slice(0, TOP)}
                nameHeader="Perturbed gene"
                linkTo={asPerturbation}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export { GeneConsensus };
