import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { coreSettingsChanged, fetchDatasetsFromBackend } from "../../store/settings/core-settings";
import { DATASET_KINDS, datasetHasKind, datasetKind, datasetMatches, facetValues } from "../../utils/datasetFilters";
import { fetchDrugCollection } from "../../store/api/drugs";
import { genePagePath } from "../../utils/geneLinks";
import { isDrugDataset, perturbationCountLabel } from "../../utils/perturbationKind";
import styles from "./datasets-page.module.scss";

const formatCount = (value) => (typeof value === "number" ? value.toLocaleString("en-US") : "–");

// "… (doi:10.1016/j.cell.2022.05.013)" -> link to the DOI
const doiLink = (citation) => {
  const match = /doi:\s*(10\.[^\s)]+)/i.exec(citation || "");
  return match ? `https://doi.org/${match[1]}` : null;
};

const KIND_LABEL = { genome: "Genome-wide", focused: "Focused", mine: "My upload", chemical: "Chemical" };

// The drug collection has one table per cell line. They are not shown as
// cards of their own but as a list inside the card of the collection.
const isLineTable = (dataset) => isDrugDataset(dataset) && dataset.drugTable === "line";

/**
 * The cell-line tables of a drug collection: compact, filterable.
 * `lines` are the datasets (already narrowed by the filters of the page),
 * `extra` holds what the collection endpoint adds per table (driver genes).
 */
const LineTables = ({ lines, total, extra, selectedId, onUse }) => {
  const [text, setText] = useState("");
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = lines.filter((line) => {
    if (words.length === 0) return true;
    const haystack = [line.id, line.cellLine, line.organ, ...(extra[line.id]?.drivers || [])].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  return (
    <details className={styles.lines} open={lines.length !== total || undefined} data-testid="line-tables">
      <summary>
        {lines.length === total
          ? `${total} cell-line table${total === 1 ? "" : "s"}`
          : `${lines.length} of ${total} cell-line tables match`}
      </summary>
      <input
        type="search"
        className={styles.linesSearch}
        placeholder="Filter by cell line, organ or driver gene…"
        aria-label="Filter the cell-line tables"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={styles.linesScroll}>
        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th>Cell line</th>
              <th>Organ</th>
              <th>Driver genes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const drivers = extra[line.id]?.drivers || [];
              return (
                <tr key={line.id} className={line.id === selectedId ? styles.lineSelected : undefined}>
                  <th scope="row" title={`${line.id} · ${formatCount(line.perturbationCount)} treatments · ${formatCount(line.geneCount)} genes`}>
                    {line.cellLine || line.id}
                  </th>
                  <td>{line.organ || "–"}</td>
                  <td className={styles.drivers}>
                    {drivers.length === 0
                      ? "–"
                      : drivers.map((gene, index) => (
                          <React.Fragment key={gene}>
                            {index > 0 && ", "}
                            <Link to={genePagePath(gene)}>{gene}</Link>
                          </React.Fragment>
                        ))}
                  </td>
                  <td>
                    <button type="button" className={styles.lineUse} onClick={() => onUse(line, ROUTES.CORRELATION)}>
                      Use
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>No cell-line table matches.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
};

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

  // Facets and cards leave the per-cell-line tables of the drug collection out
  // (47 near-identical entries); those are listed inside the collection's card.
  const cardDatasets = useMemo(() => datasets.filter((d) => !isLineTable(d)), [datasets]);
  const lineTables = useMemo(() => datasets.filter(isLineTable), [datasets]);
  const cellLines = useMemo(() => facetValues(cardDatasets, "cellLine"), [cardDatasets]);
  const types = useMemo(() => facetValues(cardDatasets, "perturbationType"), [cardDatasets]);
  const filters = useMemo(() => ({ text, kind, cellLine, perturbationType }), [text, kind, cellLine, perturbationType]);
  const matchingLines = useMemo(
    // the cell-line facet lists the cards only, so it does not narrow the line tables
    () => lineTables.filter((d) => datasetMatches(d, { ...filters, cellLine: "" })),
    [lineTables, filters]
  );
  const shown = useMemo(() => {
    // A collection stays visible when one of its cell-line tables matches
    const parents = new Set(cellLine ? [] : matchingLines.map((d) => d.parent));
    return cardDatasets.filter((d) => datasetMatches(d, filters) || (parents.has(d.id) && datasetHasKind(d, kind)));
  }, [cardDatasets, matchingLines, filters, cellLine, kind]);

  // Driver genes of the cell lines (best effort; the list works without them)
  const hasDrugDatasets = lineTables.length > 0;
  const [lineExtra, setLineExtra] = useState({});
  useEffect(() => {
    if (!hasDrugDatasets) return undefined;
    const controller = new AbortController();
    fetchDrugCollection({ signal: controller.signal })
      .then((collection) => {
        const extra = {};
        (collection?.tables || []).forEach((table) => {
          extra[table.dataset] = table;
        });
        setLineExtra(extra);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [hasDrugDatasets]);

  const hasUploads = datasets.some((d) => d.isUserUploaded);
  const kindOptions = DATASET_KINDS.filter(
    (k) => (k.id !== "mine" || hasUploads) && ((k.id !== "genetic" && k.id !== "chemical") || hasDrugDatasets)
  ).map((k) => ({
    value: k.id,
    label: k.label,
    count: datasets.filter((d) => datasetHasKind(d, k.id)).length,
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
          The datasets available in GeneSetR: Perturb-seq screens, in which genes are knocked down, and a drug
          screen, in which cells are treated with small molecules. Each holds z-scored expression changes for every
          perturbation, plus precomputed correlations. The same list is available to programs at{" "}
          <code>/api/v1/datasets</code>.
        </p>

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by name, cell line, organ, description…"
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
            Showing {shown.length + (cellLine ? 0 : matchingLines.length)} of {datasets.length} datasets
            {lineTables.length > 0 && ` (the cell-line tables of the drug screen, ${lineTables.length}, are listed in its card)`}
            {shown.length + (cellLine ? 0 : matchingLines.length) !== datasets.length && (
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
            const drug = isDrugDataset(dataset);
            const ownLines = drug ? lineTables.filter((d) => d.parent === dataset.id) : [];
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
                    <dt>{perturbationCountLabel(dataset)}</dt>
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

                {ownLines.length > 0 && (
                  <LineTables
                    lines={cellLine ? [] : matchingLines.filter((d) => d.parent === dataset.id)}
                    total={ownLines.length}
                    extra={lineExtra}
                    selectedId={core.cellLine?.id}
                    onUse={use}
                  />
                )}

                <div className={styles.actions}>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.CORRELATION)}>
                    Correlation
                  </button>
                  <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.DR)}>
                    Clustering
                  </button>
                  {drug ? (
                    <button type="button" className={styles.action} onClick={() => navigate(ROUTES.DRUG)}>
                      Explore a drug
                    </button>
                  ) : (
                    <button type="button" className={styles.action} onClick={() => use(dataset, ROUTES.GENE_REGULATION)}>
                      Gene regulation
                    </button>
                  )}
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
