import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaExternalLinkAlt } from "react-icons/fa";
import { DrugSearch } from "../../components/drug-search";
import { fetchDrugSummary } from "../../store/api/drugs";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { baseSymbol, genePagePath } from "../../utils/geneLinks";
import { drugIdOf, drugLabelsFor, drugPagePath } from "../../utils/perturbationKind";
import { sendGenesTo } from "../../utils/sendTo";
import styles from "../gene/gene-page.module.scss";
import own from "./drug-page.module.scss";

const EXAMPLES = ["BORTEZOMIB", "TRAMETINIB", "PANOBINOSTAT", "DEXAMETHASONE", "PALBOCICLIB"];

// Treated cells relative to a typical treatment of the same cell line and
// dose; below this the dose probably kills or arrests the cells.
const FEW_CELLS_BELOW = 0.5;

const MAIN_TABLE = "TahoeDrugs";
const DOSE_TABLE = "TahoeAll";
const EMPTY = [];

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const fmt = (value, digits = 2) => (isNumber(value) ? value.toFixed(digits) : "–");
const titleCase = (id) =>
  String(id || "")
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (m, sep, letter) => sep + letter.toUpperCase());

// Diverging blue-red for values in [-limit, limit] (same scale as the gene page)
const divergingColor = (value, limit) => {
  if (!isNumber(value)) return "transparent";
  const t = Math.max(-1, Math.min(1, value / limit));
  const alpha = Math.abs(t) * 0.85;
  return t >= 0 ? `rgba(200, 55, 60, ${alpha})` : `rgba(45, 105, 190, ${alpha})`;
};

// Response strength: about 1 for an inert treatment, larger for a stronger one
const strengthColor = (value, max) => {
  if (!isNumber(value)) return "transparent";
  const t = Math.max(0, Math.min(1, (value - 1) / Math.max(max - 1, 0.5)));
  return `rgba(200, 55, 60, ${(t * 0.85).toFixed(3)})`;
};

const GeneLink = ({ label }) => (
  <Link className={styles.geneLink} to={genePagePath(label)} title={`Open the gene page of ${baseSymbol(label)}`}>
    {label}
  </Link>
);

const DrugLink = ({ id, name }) => (
  <Link className={styles.geneLink} to={drugPagePath(id)} title={`Open the drug page of ${name || id}`}>
    {name || titleCase(id)}
  </Link>
);

/** Genes with z-score and log2 fold change. */
const GeneTable = ({ title, rows }) => (
  <div>
    <div className={styles.rankedTitle}>{title}</div>
    {!rows || rows.length === 0 ? (
      <div className={styles.muted}>None</div>
    ) : (
      <table className={own.smallTable}>
        <thead>
          <tr>
            <th>Gene</th>
            <th className={styles.num}>z</th>
            <th className={styles.num}>log2FC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.gene}>
              <td>
                <GeneLink label={row.gene} />
              </td>
              <td className={styles.num}>
                <span className={styles.value} style={{ background: divergingColor(row.z, 10) }}>
                  {fmt(row.z, 1)}
                </span>
              </td>
              <td className={styles.num}>{fmt(row.log2fc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

/** Knock-downs ranked by the correlation of their profile with the drug's. */
const KnockdownList = ({ title, rows }) => (
  <div>
    <div className={styles.rankedTitle}>{title}</div>
    {!rows || rows.length === 0 ? (
      <div className={styles.muted}>None</div>
    ) : (
      <ol className={styles.rankedList}>
        {rows.map((row) => (
          <li key={row.perturbation} className={styles.rankedRow}>
            <GeneLink label={row.perturbation} />
            <span className={styles.value} style={{ background: divergingColor(row.r, 0.6) }}>
              {fmt(row.r)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

const SORTS = [
  { id: "top", label: "Strongest at the top dose" },
  { id: "organ", label: "By organ" },
  { id: "line", label: "By cell line" },
];

/** Cell lines × doses, coloured by the strength of the response. */
const ResponseTable = ({ response }) => {
  const [sort, setSort] = useState("top");
  const doses = response?.doses || EMPTY;
  const lines = response?.lines || EMPTY;
  const topDose = doses[doses.length - 1];
  const hasCells = lines.some((line) => line.cellsByDose && Object.values(line.cellsByDose).some(isNumber));

  const sorted = useMemo(() => {
    const rows = [...lines];
    const byName = (a, b) => String(a.cellLine || a.dataset).localeCompare(String(b.cellLine || b.dataset));
    if (sort === "line") rows.sort(byName);
    else if (sort === "organ") rows.sort((a, b) => String(a.organ || "").localeCompare(String(b.organ || "")) || byName(a, b));
    else {
      const value = (row) => (isNumber(row.byDose?.[topDose]) ? row.byDose[topDose] : -Infinity);
      rows.sort((a, b) => value(b) - value(a) || byName(a, b));
    }
    return rows;
  }, [lines, sort, topDose]);

  const max = useMemo(
    () => Math.max(2, ...lines.flatMap((line) => doses.map((dose) => line.byDose?.[dose])).filter(isNumber)),
    [lines, doses]
  );

  if (lines.length === 0) return <p className={styles.muted}>No per-cell-line tables for this drug.</p>;

  // Three side-by-side blocks keep the 47 cell lines on one screen
  const blockSize = Math.ceil(sorted.length / 3);
  const blocks = [0, 1, 2].map((i) => sorted.slice(i * blockSize, (i + 1) * blockSize)).filter((b) => b.length > 0);

  return (
    <>
      <div className={styles.datasetChips} role="group" aria-label="Order of the cell lines">
        <span className={styles.muted}>Order:</span>
        {SORTS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={sort === option.id}
            className={`${styles.chip} ${sort === option.id ? styles.chipActive : ""}`}
            onClick={() => setSort(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={own.heatBlocks} data-testid="drug-response">
        {blocks.map((block, blockIndex) => (
          <table key={blockIndex} className={own.heat}>
            <thead>
              <tr>
                <th>Cell line</th>
                <th>Organ</th>
                {doses.map((dose) => (
                  <th key={dose} className={styles.num}>
                    {dose} {response.unit || "µM"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.map((line, index) => {
                const newOrgan = sort === "organ" && (index === 0 || block[index - 1].organ !== line.organ);
                return (
                  <tr key={line.dataset} className={newOrgan && index > 0 ? own.groupStart : undefined}>
                    <th scope="row" title={line.dataset}>
                      {line.cellLine || line.dataset}
                    </th>
                    <td className={own.organ}>{line.organ || "–"}</td>
                    {doses.map((dose) => {
                      const value = line.byDose?.[dose];
                      const cells = line.cellsByDose?.[dose];
                      const fewCells = isNumber(cells) && cells < FEW_CELLS_BELOW;
                      const title = [
                        `${line.cellLine || line.dataset}, ${dose} ${response.unit || "µM"}`,
                        isNumber(value) ? `response strength ${fmt(value)}` : "not measured",
                        isNumber(cells)
                          ? `${Math.round(cells * 100)}% of the cells of a typical treatment${fewCells ? " (few cells: the dose may be cytotoxic or cytostatic here)" : ""}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <td
                          key={dose}
                          className={own.cell}
                          style={{ background: strengthColor(value, max) }}
                          title={title}
                        >
                          {fmt(value, 1)}
                          {fewCells && (
                            <span className={own.fewCells} aria-label="few cells">
                              ▾
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>
      <p className={styles.help}>
        The number and the colour give the strength of the response: the spread of the drug's calibrated z-score
        profile in that cell line and dose (about 1 for an inert treatment; it grows with the effect and with the
        number of cells measured).
        {hasCells && (
          <>
            {" "}
            <span className={own.fewCells} aria-hidden="true">
              ▾
            </span>{" "}
            marks treatments with fewer than {Math.round(FEW_CELLS_BELOW * 100)}% of the cells of a typical treatment
            of that cell line and dose: the dose is probably cytotoxic or cytostatic there (occasionally a failed
            well), and the strength can fall because few cells survive. Hover a cell for the percentage.
          </>
        )}
      </p>
    </>
  );
};

const DrugPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const datasetList = useSelector((state) => state.settings?.core?.datasetList) || EMPTY;
  const drugId = drugIdOf(params.get("id"));

  const [summary, setSummary] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | notFound | error
  const [error, setError] = useState("");
  const [knockdownDataset, setKnockdownDataset] = useState(null);

  useEffect(() => {
    setSummary(null);
    setKnockdownDataset(null);
    if (!drugId) {
      setState("idle");
      return undefined;
    }
    document.title = `${titleCase(drugId)} – GeneSetR`;
    const controller = new AbortController();
    setState("loading");
    fetchDrugSummary(drugId, { signal: controller.signal })
      .then((data) => {
        setSummary(data);
        setKnockdownDataset(data.knockdowns?.[0]?.dataset || null);
        if (data.drug?.name) document.title = `${data.drug.name} – GeneSetR`;
        setState("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        setState(err.notFound ? "notFound" : "error");
      });
    return () => {
      controller.abort();
      document.title = "GeneSetR";
    };
  }, [drugId]);

  const datasetNames = useMemo(
    () => Object.fromEntries(datasetList.map((d) => [d.id, d.name || d.id])),
    [datasetList]
  );
  const hasDataset = (id) => datasetList.some((d) => d.id === id);

  const drug = summary?.drug;
  const similar = summary?.similar || [];
  const knockdowns = summary?.knockdowns || [];
  const currentKnockdowns = knockdowns.find((k) => k.dataset === knockdownDataset) || null;

  // The drug and its most similar drugs, as the first list of a module
  const openWithSimilar = (target, datasetId) => {
    const dataset = datasetList.find((d) => d.id === datasetId);
    const ids = [drug.id, ...similar.map((row) => row.drug)];
    const labels = ids.flatMap((id) => drugLabelsFor(id, dataset));
    dispatch(coreSettingsChanged({ settingName: "dataType", newValue: "pert" }));
    const path = dispatch(sendGenesTo(target, labels, { datasetId }));
    if (path) navigate(path);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.searchRow}>
          <DrugSearch size="lg" autoFocus={!drugId} initialValue={drug?.name || ""} />
        </div>

        {state === "idle" && (
          <div className={styles.intro}>
            <h1>Explore a drug</h1>
            <p>
              Everything the Tahoe-100M drug screen in GeneSetR says about one drug: how strongly each of 47 cancer
              cell lines responds at three doses, which genes it changes, which drugs act like it, and which gene
              knock-downs give a similar or an opposite expression profile.
            </p>
            <div className={styles.examples}>
              Try:
              {EXAMPLES.map((example) => (
                <Link key={example} className={styles.chip} to={drugPagePath(example)}>
                  {titleCase(example)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className={styles.status} role="status">
            Reading {titleCase(drugId)} from the drug screen…
          </div>
        )}

        {state === "notFound" && (
          <div className={styles.status} role="alert">
            <strong>{drugId}</strong> is not a drug of the screen. Search by name, by target gene or by mechanism in
            the box above.
          </div>
        )}

        {state === "error" && (
          <div className={styles.status} role="alert">
            Could not load {drugId}: {error}
          </div>
        )}

        {state === "ready" && drug && (
          <>
            <header className={styles.header}>
              <div className={styles.titleRow}>
                <h1>{drug.name || drug.id}</h1>
                {(drug.moaFine || drug.moaBroad) && (
                  <span className={styles.geneName}>
                    {drug.moaFine && drug.moaFine !== "unclear" ? drug.moaFine : "Mechanism unclear"}
                    {drug.moaBroad && drug.moaBroad !== "unclear" ? ` (${drug.moaBroad})` : ""}
                  </span>
                )}
              </div>
              <div className={styles.links}>
                {drug.approved && <span className={own.badge}>Approved drug</span>}
                {drug.clinicalTrials && <span className={own.badgeMuted}>In clinical trials</span>}
                {drug.pubchemCid && (
                  <a
                    className={styles.chip}
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(drug.pubchemCid)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PubChem <FaExternalLinkAlt size={10} aria-hidden="true" />
                  </a>
                )}
                <span className={own.id} title="Id of the drug in the datasets">
                  {drug.id}
                </span>
              </div>
              <div className={styles.links}>
                <span className={styles.muted}>Annotated targets:</span>
                {drug.targets?.length > 0 ? (
                  drug.targets.map((target) => (
                    <Link key={target} className={styles.chip} to={genePagePath(target)} title={`Open the gene page of ${target}`}>
                      {target}
                    </Link>
                  ))
                ) : (
                  <span className={styles.muted}>none recorded</span>
                )}
              </div>
              {summary.strength && (
                <p className={styles.muted}>
                  Pooled over all cell lines and doses, {(summary.strength.genesAbsZOver3 ?? 0).toLocaleString("en-US")} of{" "}
                  {(summary.strength.genesMeasured ?? 0).toLocaleString("en-US")} measured genes change with |z| &gt; 3.
                </p>
              )}
              {summary.screened === false && (
                <p className={styles.muted}>This drug is annotated but has no expression profile in the screen.</p>
              )}
            </header>

            {(hasDataset(MAIN_TABLE) || hasDataset(DOSE_TABLE)) && summary.screened !== false && (
              <div className={styles.openIn}>
                <span className={styles.muted}>Open in:</span>
                {hasDataset(MAIN_TABLE) && similar.length > 0 && (
                  <button
                    type="button"
                    className={styles.action}
                    title="This drug and its most similar drugs, one profile per drug"
                    onClick={() => openWithSimilar("correlation", MAIN_TABLE)}
                  >
                    Correlation (with similar drugs)
                  </button>
                )}
                {hasDataset(DOSE_TABLE) && similar.length > 0 && (
                  <button
                    type="button"
                    className={styles.action}
                    title="This drug and its most similar drugs, one profile per dose"
                    onClick={() => openWithSimilar("correlation", DOSE_TABLE)}
                  >
                    Correlation (every dose)
                  </button>
                )}
                {hasDataset(MAIN_TABLE) && similar.length > 1 && (
                  <button
                    type="button"
                    className={styles.action}
                    title="Expression of the measured genes under this drug and its most similar drugs"
                    onClick={() => openWithSimilar("heatmap", MAIN_TABLE)}
                  >
                    Heatmap (with similar drugs)
                  </button>
                )}
                {hasDataset(MAIN_TABLE) && (
                  <button
                    type="button"
                    className={styles.action}
                    title="All genes this drug changes"
                    onClick={() => {
                      const path = dispatch(sendGenesTo("deregulated", [drug.id], { datasetId: MAIN_TABLE }));
                      if (path) navigate(path);
                    }}
                  >
                    Deregulated Genes
                  </button>
                )}
              </div>
            )}

            <section className={styles.section}>
              <h2>Response by cell line and dose</h2>
              <ResponseTable response={summary.response} />
            </section>

            <section className={styles.section}>
              <div className={styles.columns}>
                <div className={styles.card}>
                  <h3>Genes it changes</h3>
                  <p className={styles.help}>
                    Genes with the largest change under {drug.name || drug.id}, pooled over cell lines and doses
                    (z-score and log2 fold change against the vehicle control).
                  </p>
                  <div className={styles.pair}>
                    <GeneTable title="Up-regulated" rows={summary.genes?.up} />
                    <GeneTable title="Down-regulated" rows={summary.genes?.down} />
                  </div>
                </div>

                <div className={styles.card}>
                  <h3>Similar drugs</h3>
                  <p className={styles.help}>
                    Drugs whose expression profile correlates best with this one. A shared mechanism usually shows up
                    here.
                  </p>
                  {similar.length === 0 ? (
                    <div className={styles.muted}>None</div>
                  ) : (
                    <table className={own.smallTable}>
                      <thead>
                        <tr>
                          <th>Drug</th>
                          <th>Mechanism</th>
                          <th className={styles.num}>r</th>
                        </tr>
                      </thead>
                      <tbody>
                        {similar.map((row) => (
                          <tr key={row.drug}>
                            <td>
                              <DrugLink id={row.drug} name={row.name} />
                            </td>
                            <td className={own.mechanism} title={row.targets?.length > 0 ? `Targets: ${row.targets.join(", ")}` : undefined}>
                              {row.moaFine || "–"}
                            </td>
                            <td className={styles.num}>
                              <span className={styles.value} style={{ background: divergingColor(row.r, 1) }}>
                                {fmt(row.r)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className={styles.card}>
                  <h3>Knock-downs that mimic or reverse it</h3>
                  <p className={styles.help}>
                    Correlation between the drug's profile and the profile of each gene knock-down, over the genes
                    both datasets measure. A high score is a hypothesis about the pathway involved, not a target call.
                  </p>
                  {knockdowns.length === 0 ? (
                    <div className={styles.muted}>No genetic dataset to compare with.</div>
                  ) : (
                    <>
                      <div className={styles.datasetChips} role="tablist" aria-label="Genetic dataset">
                        {knockdowns.map((k) => (
                          <button
                            key={k.dataset}
                            type="button"
                            role="tab"
                            aria-selected={k.dataset === knockdownDataset}
                            className={`${styles.chip} ${k.dataset === knockdownDataset ? styles.chipActive : ""}`}
                            onClick={() => setKnockdownDataset(k.dataset)}
                          >
                            {datasetNames[k.dataset] || k.dataset}
                          </button>
                        ))}
                      </div>
                      {currentKnockdowns && (
                        <div className={styles.pair}>
                          <KnockdownList title="Mimic the drug" rows={currentKnockdowns.mimic} />
                          <KnockdownList title="Reverse the drug" rows={currentKnockdowns.reverse} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export { DrugPage };
