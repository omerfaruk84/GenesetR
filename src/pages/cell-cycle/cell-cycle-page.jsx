import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCellCycleDatasets } from "../../store/api/cellcycle";
import { cellCyclePath, readCellCycleQuery } from "../../utils/cellCycle";
import { CompareView } from "./compare-view";
import { CoverageView } from "./coverage-view";
import { DatasetView } from "./dataset-view";
import { GeneView } from "./gene-view";
import { DatasetPicker } from "./parts";
import styles from "./cell-cycle-page.module.scss";

const TABS = [
  { key: "dataset", label: "Explore a dataset" },
  { key: "gene", label: "One gene, all datasets" },
  { key: "compare", label: "Compare datasets" },
  { key: "coverage", label: "Datasets & method" },
];

const DEFAULT_DATASET = "K562gwps";

/**
 * Cell-cycle page: which perturbations change the share of cells in G1, S and G2/M.
 * State lives in the address (view, dataset, gene, metric), so every view can be shared.
 */
const CellCyclePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => readCellCycleQuery(location.search), [location.search]);
  const [datasets, setDatasets] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    document.title = "Cell cycle – GeneSetR";
    let current = true;
    fetchCellCycleDatasets()
      .then((data) => current && setDatasets(data.datasets || []))
      .catch((err) => current && setError(err.message));
    return () => {
      current = false;
      document.title = "GeneSetR";
    };
  }, []);

  const view = query.view || (query.gene && !query.dataset ? "gene" : "dataset");
  const datasetId = useMemo(() => {
    if (!datasets?.length) return null;
    const ids = datasets.map((d) => d.dataset_id);
    if (query.dataset && ids.includes(query.dataset)) return query.dataset;
    return ids.includes(DEFAULT_DATASET) ? DEFAULT_DATASET : (datasets.find((d) => d.has_phase) || datasets[0]).dataset_id;
  }, [datasets, query.dataset]);
  const dataset = datasets?.find((d) => d.dataset_id === datasetId) || null;

  useEffect(() => setSelected(view === "dataset" ? query.gene : null), [datasetId, view, query.gene]);

  const go = useCallback(
    (patch, { replace = false } = {}) => {
      const next = { view, dataset: query.dataset, gene: query.gene, metric: query.metric, ...patch };
      navigate(cellCyclePath(next), { replace });
    },
    [navigate, view, query]
  );

  const select = useCallback(
    (target) => {
      setSelected(target);
      go({ view: "dataset", dataset: datasetId, gene: target || null }, { replace: true });
    },
    [go, datasetId]
  );

  const withPhase = datasets ? datasets.filter((d) => d.has_phase).length : 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <div>
            <h1>Cell cycle</h1>
            <p className={styles.lead}>
              Which perturbations push cells into G1, S or G2/M? Every cell of {withPhase || "the"} single-cell datasets
              was assigned a phase from its expression and compared with control cells of the same batches; every other
              dataset, drugs included, has the cell-cycle signature of its profiles.
            </p>
          </div>
          {view === "dataset" && datasets && (
            <DatasetPicker datasets={datasets} value={datasetId} onChange={(id) => go({ view: "dataset", dataset: id, gene: null })} />
          )}
        </div>

        <nav className={styles.tabs} role="tablist" aria-label="Cell-cycle views">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={view === t.key}
              className={`${styles.tab} ${view === t.key ? styles.tabActive : ""}`}
              onClick={() =>
                go({
                  view: t.key,
                  dataset: t.key === "dataset" ? datasetId : query.dataset,
                  gene: t.key === "gene" ? query.gene || selected : t.key === "dataset" ? null : query.gene,
                })
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error && (
          <div className={styles.status} role="alert">
            Cell-cycle data unavailable: {error}
          </div>
        )}
        {!datasets && !error && <div className={styles.status}>Loading the datasets…</div>}

        {datasets && view === "dataset" && <DatasetView dataset={dataset} selected={selected} onSelect={select} />}
        {datasets && view === "gene" && <GeneView gene={query.gene} onGene={(g) => go({ view: "gene", gene: g })} />}
        {datasets && view === "compare" && (
          <CompareView
            datasets={datasets}
            metric={query.metric || "delta_g2m"}
            onMetric={(m) => go({ metric: m }, { replace: true })}
            onPickGene={(g) => go({ view: "gene", gene: g })}
          />
        )}
        {datasets && view === "coverage" && (
          <CoverageView datasets={datasets} onOpen={(id) => go({ view: "dataset", dataset: id, gene: null })} />
        )}
      </div>
    </div>
  );
};

export { CellCyclePage };
