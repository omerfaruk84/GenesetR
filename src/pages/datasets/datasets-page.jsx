import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { coreSettingsChanged, fetchDatasetsFromBackend } from "../../store/settings/core-settings";
import { DATASET_KINDS, datasetKind, datasetMatches, facetValues } from "../../utils/datasetFilters";
import styles from "./datasets-page.module.scss";

const formatCount = (value) => (typeof value === "number" ? value.toLocaleString("en-US") : "–");

// "… (doi:10.1016/j.cell.2022.05.013)" -> link to the DOI
const doiLink = (citation) => {
  const match = /doi:\s*(10\.[^\s)]+)/i.exec(citation || "");
  return match ? `https://doi.org/${match[1]}` : null;
};

const KIND_LABEL = { genome: "Genome-wide", focused: "Focused", mine: "My upload" };

const ChipGroup = ({ label, options, value, onChange }) => (
  <div className={styles.chipGroup}>
    <span className={styles.chipLabel}>{label}</span>
    {options.map((option) => (
      <button
        key={option.value || "all"}
        type="button"
        aria-pressed={value === option.value}
        className={`${styles.chip} ${value === option.value ? styles.chipActive : ""}`}
        onClick={() => onChange(option.value)}
      >
        {option.label}
        {option.count !== undefined && <span className={styles.chipCount}>{option.count}</span>}
      </button>
    ))}
  </div>
);

const DatasetsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const core = useSelector((state) => state.settings?.core) || {};
  const datasets = useMemo(
    () => (core.datasetList || []).filter((d) => d.isDrResult !== true),
    [core.datasetList]
  );

  const [text, setText] = useState("");
  const [kind, setKind] = useState("all");
  const [cellLine, setCellLine] = useState("");
  const [perturbationType, setPerturbationType] = useState("");

  const cellLines = useMemo(() => facetValues(datasets, "cellLine"), [datasets]);
  const types = useMemo(() => facetValues(datasets, "perturbationType"), [datasets]);
  const shown = useMemo(
    () => datasets.filter((d) => datasetMatches(d, { text, kind, cellLine, perturbationType })),
    [datasets, text, kind, cellLine, perturbationType]
  );

  const hasUploads = datasets.some((d) => d.isUserUploaded);
  const kindOptions = DATASET_KINDS.filter((k) => k.id !== "mine" || hasUploads).map((k) => ({
    value: k.id,
    label: k.label,
    count: k.id === "all" ? datasets.length : datasets.filter((d) => datasetKind(d) === k.id).length,
  }));
  const withAll = (rows) => [{ value: "", label: "Any" }, ...rows.map((r) => ({ value: r.value, label: r.value, count: r.count }))];

  const use = (dataset, route) => {
    dispatch(coreSettingsChanged({ settingName: "cellLine", newValue: dataset }));
    navigate(route);
  };

  const clear = () => {
    setText("");
    setKind("all");
    setCellLine("");
    setPerturbationType("");
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Datasets</h1>
        <p className={styles.lead}>
          The Perturb-seq datasets available in GeneSetR. Each holds z-scored expression changes for every
          perturbation, plus precomputed correlations. The same list is available to programs at{" "}
          <code>/api/v1/datasets</code>.
        </p>

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by name, cell line, description…"
            aria-label="Search datasets"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <ChipGroup label="Scope" options={kindOptions} value={kind} onChange={setKind} />
          {cellLines.length > 0 && (
            <ChipGroup label="Cell line" options={withAll(cellLines)} value={cellLine} onChange={setCellLine} />
          )}
          {types.length > 0 && (
            <ChipGroup label="Perturbation" options={withAll(types)} value={perturbationType} onChange={setPerturbationType} />
          )}
        </div>

        {core.datasetsLoading && datasets.length === 0 && <div className={styles.status}>Loading datasets…</div>}

        {core.datasetsError && datasets.length === 0 && (
          <div className={styles.status} role="alert">
            The dataset list could not be loaded.{" "}
            <button type="button" className={styles.action} onClick={() => dispatch(fetchDatasetsFromBackend(core.sessionId))}>
              Retry
            </button>
          </div>
        )}

        {datasets.length > 0 && (
          <p className={styles.count}>
            Showing {shown.length} of {datasets.length} datasets
            {shown.length !== datasets.length && (
              <button type="button" className={styles.textButton} onClick={clear}>
                Clear filters
              </button>
            )}
          </p>
        )}

        <div className={styles.grid}>
          {shown.map((dataset) => {
            const doi = doiLink(dataset.citation);
            const selected = core.cellLine?.id === dataset.id;
            return (
              <article key={dataset.id} className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
                <header className={styles.cardHeader}>
                  <h2>{dataset.name || dataset.id}</h2>
                  <span className={styles.badge}>{KIND_LABEL[datasetKind(dataset)]}</span>
                </header>
                <div className={styles.id}>{dataset.id}</div>
                {dataset.description && <p className={styles.description}>{dataset.description}</p>}

                <dl className={styles.facts}>
                  <div>
                    <dt>Cell line</dt>
                    <dd>{dataset.cellLine || "–"}</dd>
                  </div>
                  <div>
                    <dt>Perturbation</dt>
                    <dd>{dataset.perturbationType || "–"}</dd>
                  </div>
                  <div>
                    <dt>Perturbations</dt>
                    <dd>{formatCount(dataset.perturbationCount)}</dd>
                  </div>
                  <div>
                    <dt>Genes measured</dt>
                    <dd>{formatCount(dataset.geneCount)}</dd>
                  </div>
                  <div>
                    <dt>Correlations</dt>
                    <dd>{(dataset.availableMethods || []).join(", ") || "–"}</dd>
                  </div>
                  <div>
                    <dt>Licence</dt>
                    <dd>{dataset.license || "–"}</dd>
                  </div>
                </dl>

                <p className={styles.citation}>
                  {dataset.citation ? (
                    doi ? (
                      <a href={doi} target="_blank" rel="noopener noreferrer">
                        {dataset.citation}
                      </a>
                    ) : (
                      dataset.citation
                    )
                  ) : dataset.isUserUploaded ? (
                    "Uploaded by you; visible only in this browser session."
                  ) : (
                    "Citation not recorded yet."
                  )}
                  {dataset.sourceUrl && (
                    <>
                      {" · "}
                      <a href={dataset.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Source data
                      </a>
                    </>
                  )}
                </p>

                <div className={styles.actions}>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.CORRELATION)}>
                    Correlation
                  </button>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.DR)}>
                    Clustering
                  </button>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.GENE_REGULATION)}>
                    Gene regulation
                  </button>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.GENESIGNATURE)}>
                    Gene signature
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {datasets.length > 0 && shown.length === 0 && (
          <div className={styles.status}>No dataset matches these filters.</div>
        )}
      </div>
    </div>
  );
};

export { DatasetsPage };
