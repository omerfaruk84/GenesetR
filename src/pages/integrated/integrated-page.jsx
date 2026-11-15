import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { fetchIntegratedSummary } from "../../store/api/integrated";
import { datasetContexts, integratedPath, readIntegratedQuery } from "../../utils/integrated";
import { GeneMode } from "./gene-mode";
import { SetMode } from "./set-mode";
import { SignatureMode } from "./signature-mode";
import styles from "./integrated-page.module.scss";

const MODES = [
  { id: "gene", label: "Gene", about: "One gene as a perturbation and as a measured gene" },
  { id: "signature", label: "Signature", about: "Perturbations that lower or raise a list of up and down genes" },
  { id: "set", label: "Common effects of a gene list", about: "Genes changed consistently by a list of perturbations" },
];

/**
 * "Integrated analysis": every loss-of-function dataset combined into one
 * answer (meta z, datasets, cell contexts). The mode, its inputs and the
 * controls are in the address, so every result can be linked.
 */
const IntegratedPage = () => {
  const location = useLocation();
  const datasetList = useSelector((state) => state.settings?.core?.datasetList);
  const query = useMemo(() => readIntegratedQuery(location.search), [location.search]);
  const [summary, setSummary] = useState(null);
  // The last address of each mode, so that switching back returns to its result
  const lastAddress = useRef({});
  lastAddress.current[query.mode] = `${location.pathname}${location.search}`;

  useEffect(() => {
    document.title = "Integrated analysis – GeneSetR";
    let current = true;
    fetchIntegratedSummary().then((data) => {
      if (current) setSummary(data);
    });
    return () => {
      current = false;
      document.title = "GeneSetR";
    };
  }, []);

  const names = useMemo(() => {
    const map = {};
    (datasetList || []).forEach((dataset) => {
      map[dataset.id] = dataset.name || dataset.id;
    });
    return map;
  }, [datasetList]);
  const contextOf = useMemo(() => datasetContexts(summary), [summary]);

  const shared = { query, summary, names, contextOf };
  const datasets = summary?.datasets?.length;
  const contexts = summary ? Object.keys(summary.contexts || {}).length : 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Integrated analysis</h1>
        <p className={styles.lead}>
          One answer from all knock-down and knock-out datasets instead of one dataset at a time
          {datasets ? `: ${datasets} datasets in ${contexts} cell contexts` : ""}. Every result says in how many
          datasets and in how many cell contexts it is seen.
        </p>
        <div className={styles.tabs} role="tablist" aria-label="Mode">
          {MODES.map((mode) => (
            <Link
              key={mode.id}
              role="tab"
              aria-selected={query.mode === mode.id}
              className={query.mode === mode.id ? styles.chipActive : styles.chip}
              title={mode.about}
              to={lastAddress.current[mode.id] || integratedPath({ mode: mode.id })}
            >
              {mode.label}
            </Link>
          ))}
        </div>
        {query.mode === "gene" && <GeneMode {...shared} />}
        {query.mode === "signature" && <SignatureMode {...shared} />}
        {query.mode === "set" && <SetMode {...shared} />}
      </div>
    </div>
  );
};

export { IntegratedPage };
