import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RegulatorTable } from "../../components/regulator-table";
import { fetchRegulatorsOfGene } from "../../store/api/regulators";
import { ROUTES } from "../../common/routes";
import { callDirection, callEvidence } from "../../utils/regulators";
import styles from "./gene-page.module.scss";

const SHORT = 8;
const LONG = 20;

const GROUPS = [
  { key: "supportedByBoth", title: "Supported by both directions" },
  { key: "activators", title: (symbol) => `Raise ${symbol}` },
  { key: "repressors", title: (symbol) => `Lower ${symbol}` },
];

/**
 * "Transcription factors that regulate <SYMBOL>" on the gene page: TFs whose
 * overexpression (TF Atlas) and knock-down change the gene. Renders nothing
 * when the gene is measured nowhere or the request fails.
 */
const GeneRegulators = ({ symbol, datasetNames = {} }) => {
  const [data, setData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setData(null);
    setShowAll(false);
    if (!symbol) return undefined;
    const controller = new AbortController();
    fetchRegulatorsOfGene(symbol, { topN: LONG, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || !result || result.found !== true) return;
      setData(result);
    });
    return () => controller.abort();
  }, [symbol]);

  if (!data) return null;
  const groups = GROUPS.map((group) => ({ ...group, rows: data[group.key] || [] }));
  if (groups.every((group) => group.rows.length === 0)) return null;

  const gainDatasets = data.gainDatasets || [];
  const hasGain = gainDatasets.length > 0;
  const limit = 2 * (data.strongZ || 3);
  const canShowMore = groups.some((group) => group.rows.length > SHORT);

  return (
    <section className={styles.section} data-testid="gene-regulators">
      <h2>Transcription factors that regulate {symbol}</h2>
      <p className={styles.help}>
        z-score of {symbol} when a TF is overexpressed (TF Atlas, human stem cells) and when the same TF is knocked
        down or knocked out (combined over the datasets that perturb it). A TF that raises {symbol} when overexpressed
        and lowers it when knocked down is a supported activator; the reverse is a supported repressor. The{" "}
        {data.tested} “TFs” are the genes of the TF Atlas library; hits seen only after knock-down are often essential
        genes whose loss stresses the cell. Open a row for the value in each dataset.
      </p>
      {!hasGain && (
        <p className={styles.help}>
          {symbol} is not measured in the TF Atlas, so only knock-down evidence is available.
        </p>
      )}
      <div className={styles.openIn}>
        <Link className={styles.action} to={ROUTES.TF_REGULATORS}>
          Find TFs for a gene list
        </Link>
        {canShowMore && (
          <button type="button" className={styles.action} aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
            {showAll ? `Show the top ${SHORT}` : `Show up to ${LONG}`}
          </button>
        )}
      </div>
      <div className={styles.columns}>
        {groups.map((group) => (
          <div key={group.key} className={styles.card}>
            <h3>{typeof group.title === "function" ? group.title(symbol) : group.title}</h3>
            <RegulatorTable
              compact
              hideGain={!hasGain}
              callHeader={group.key === "supportedByBoth" ? "Call" : "Evidence"}
              callLabel={group.key === "supportedByBoth" ? callDirection : callEvidence}
              rows={showAll ? group.rows : group.rows.slice(0, SHORT)}
              names={datasetNames}
              gainDatasets={gainDatasets}
              limit={limit}
              empty={
                group.key === "supportedByBoth"
                  ? hasGain
                    ? `No TF changes ${symbol} in both overexpression and knock-down.`
                    : "Needs overexpression data, which this gene does not have."
                  : "None"
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export { GeneRegulators };
