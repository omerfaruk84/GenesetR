import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { fetchInteractionDatasets, fetchInteractionPairs } from "../../store/api/interactions";
import {
  CLASS_ABOUT,
  CLASS_LABELS,
  EXAMPLE_PAIRS,
  INTERACTION_CLASSES,
  PAIR_EXPORT_COLUMNS,
  classCounts,
  filterPairs,
  interactionsPath,
  readInteractionsQuery,
} from "../../utils/interactions";
import { OverviewChart } from "./overview-chart";
import { PairPanel } from "./pair-panel";
import { PairsTable } from "./pairs-table";
import { ClassMark, HowToRead, count, plural } from "./parts";
import styles from "./interactions-page.module.scss";

/**
 * "Genetic interactions": for pairs of genes that were perturbed together,
 * what the pair does beyond the sum of the two genes alone. The dataset, the
 * class filter, the search text and the chosen pair are in the address.
 */
const InteractionsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => readInteractionsQuery(location.search), [location.search]);
  const [summary, setSummary] = useState(null);
  const [table, setTable] = useState(null);
  const sortedRows = useRef([]);
  // the text as typed; the address holds it in upper case
  const [typed, setTyped] = useState(query.q);
  useEffect(() => {
    setTyped((current) => (current.toUpperCase() === query.q ? current : query.q));
  }, [query.q]);

  useEffect(() => {
    document.title = "Genetic interactions – GeneSetR";
    let current = true;
    fetchInteractionDatasets().then((answer) => {
      if (current) setSummary(answer);
    });
    return () => {
      current = false;
      document.title = "GeneSetR";
    };
  }, []);

  const datasets = summary?.status === "found" ? summary.data.datasets || [] : [];
  const datasetId = query.dataset || datasets[0]?.id || "";
  const dataset = datasets.find((entry) => entry.id === datasetId) || null;

  useEffect(() => {
    setTable(null);
    if (!datasetId) return undefined;
    let current = true;
    fetchInteractionPairs(datasetId).then((answer) => {
      if (current) setTable(answer);
    });
    return () => {
      current = false;
    };
  }, [datasetId]);

  const to = (changes) => interactionsPath({ ...query, ...changes });
  const pairs = table?.status === "found" ? table.data.pairs : null;
  const labels = (table?.status === "found" && table.data.classLabels) || summary?.data?.classLabels || CLASS_LABELS;
  const fdr = (table?.status === "found" && table.data.fdr) || 0.05;
  const rows = useMemo(() => filterPairs(pairs, { cls: query.cls, q: query.q }), [pairs, query.cls, query.q]);
  const visible = useMemo(() => new Set(rows.map((pair) => pair.label)), [rows]);
  const counts = useMemo(() => classCounts(pairs, query.q), [pairs, query.q]);
  const matching = useMemo(() => Object.values(counts).reduce((sum, value) => sum + value, 0), [counts]);
  const chosenLabel = useMemo(() => {
    const row = (pairs || []).find((pair) => (pair.a === query.a && pair.b === query.b) || (pair.a === query.b && pair.b === query.a));
    return row ? row.label : "";
  }, [pairs, query.a, query.b]);
  const activation = /crispra|activation/i.test(dataset?.perturbationType || "");

  const choose = (pair) => navigate(to({ a: pair.a, b: pair.b }));

  let overview = null;
  if (summary && summary.status !== "found") {
    overview = (
      <div className={styles.status} role="alert" data-testid="interactions-unavailable">
        {summary.status === "error" ? summary.message : "This server has no dataset in which genes were perturbed in pairs."}
      </div>
    );
  } else if (!summary || !table) {
    overview = (
      <div className={styles.status} role="status">
        Reading the pairs…
      </div>
    );
  } else if (table.status !== "found") {
    overview = (
      <div className={styles.status} role="alert" data-testid="interactions-unavailable">
        {table.status === "error" ? table.message : `There is no dataset “${datasetId}” with gene pairs.`}{" "}
        {query.dataset && (
          <Link className={styles.geneLink} to={to({ dataset: "" })}>
            Show the first dataset
          </Link>
        )}
      </div>
    );
  } else {
    overview = (
      <>
        <div className={styles.toolbar}>
          {datasets.length > 1 && (
            <label className={styles.control}>
              Dataset
              <select
                className={styles.select}
                value={datasetId}
                onChange={(event) => navigate(interactionsPath({ dataset: event.target.value }))}
              >
                {datasets.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <input
            className={styles.input}
            type="search"
            aria-label="Search a gene among the pairs"
            placeholder="Search a gene, e.g. CBL"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              navigate(to({ q: event.target.value }), { replace: true });
            }}
          />
          <span className={styles.muted} data-testid="interaction-count" role="status">
            {rows.length === pairs.length ? plural(pairs.length, "pair") : `${count(rows.length)} of ${plural(pairs.length, "pair")}`}
          </span>
        </div>
        <div className={styles.legend} role="group" aria-label="Class of the pair" data-testid="interaction-classes">
          <Link className={query.cls ? styles.chip : styles.chipActive} aria-current={query.cls ? undefined : "true"} to={to({ cls: "" })} replace>
            All <span className={styles.chipCount}>{count(matching)}</span>
          </Link>
          {INTERACTION_CLASSES.map((id) => (
            <Link
              key={id}
              className={query.cls === id ? styles.chipActive : styles.chip}
              aria-current={query.cls === id ? "true" : undefined}
              title={CLASS_ABOUT[id]}
              data-testid={`interaction-class-${id}`}
              to={to({ cls: query.cls === id ? "" : id })}
              replace
            >
              <ClassMark id={id} />
              {labels[id] || id} <span className={styles.chipCount}>{count(counts[id])}</span>
            </Link>
          ))}
        </div>
        <div className={styles.overview}>
          <div className={styles.chartCard} data-testid="interaction-overview">
            <OverviewChart pairs={pairs} visible={visible} chosen={chosenLabel} labels={labels} onPick={(index) => choose(pairs[index])} />
            <div className={styles.chartNote}>
              Each point is a pair. To the right of the solid line the pair does more than the two genes add up to, to
              the left less; beyond the dashed lines (0.7 and 1.3 times the sum) the difference is large enough to name.
              Below a fit of 0.5 the two genes alone do not explain the pair. Click a point to open the pair.
            </div>
          </div>
          <div className={styles.card} data-testid="interaction-pairs-card">
            <div className={styles.cardHead}>
              <div>
                <h3>Pairs</h3>
                <div className={styles.muted}>Click a column name to sort, a row to open the pair.</div>
              </div>
              <TableExportButtons
                rows={() => sortedRows.current}
                columns={PAIR_EXPORT_COLUMNS}
                filename={`genesetr-interactions-${datasetId}${query.cls ? `-${query.cls}` : ""}`}
              />
            </div>
            {rows.length === 0 ? (
              <div className={styles.muted} data-testid="interaction-none">
                No pair matches.{" "}
                <Link className={styles.geneLink} to={to({ q: "", cls: "" })} replace>
                  Show all pairs
                </Link>
              </div>
            ) : (
              <PairsTable rows={rows} labels={labels} chosen={query} to={to} onChoose={choose} sortRef={sortedRows} />
            )}
          </div>
        </div>
        {query.a && query.b ? (
          <PairPanel dataset={datasetId} a={query.a} b={query.b} labels={labels} to={to} how={<HowToRead labels={labels} fdr={fdr} />} />
        ) : (
          <div className={styles.row} data-testid="interaction-examples">
            <span className={styles.muted}>No pair is open. Try:</span>
            {EXAMPLE_PAIRS.filter((example) => pairs.some((pair) => pair.a === example.a && pair.b === example.b)).map((example) => (
              <Link key={`${example.a}+${example.b}`} className={styles.chip} title={example.about} to={to({ a: example.a, b: example.b })}>
                {example.a} + {example.b}
              </Link>
            ))}
          </div>
        )}
        {!(query.a && query.b) && <HowToRead labels={labels} fdr={fdr} />}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Genetic interactions</h1>
        <p className={styles.lead} data-testid="interactions-lead">
          What do two genes do together that neither does alone? When two genes are perturbed in the same cell, the
          simplest outcome is that their effects add up. A genetic interaction is what the pair does beyond that sum: more
          than the sum, less, the effect of only one of the two, or something new.
          {dataset && (
            <>
              {" "}
              Here: {plural(dataset.pairs, "pair")} of {count(dataset.singles)} genes in {dataset.cellLine} cells,{" "}
              {count(dataset.genes)} genes measured.{" "}
              {activation ? (
                <strong>These are activation experiments: the genes are switched on, not knocked down.</strong>
              ) : (
                <strong>Perturbation: {dataset.perturbationType}.</strong>
              )}{" "}
              <span className={styles.citation}>{dataset.citation}</span>
            </>
          )}
        </p>
        {overview}
      </div>
    </div>
  );
};

export { InteractionsPage };
