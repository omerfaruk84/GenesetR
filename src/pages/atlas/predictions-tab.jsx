import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { fetchAtlasPredictions } from "../../store/api/atlas";
import {
  CONFIDENCE_CHOICES,
  EVIDENCE_KINDS,
  PAGE_SIZE,
  PREDICTION_EXPORT_COLUMNS,
  PREDICTION_LIBRARIES,
  atlasPath,
  calibrationTable,
  evidenceName,
  libraryName,
  pageCount,
  percent,
  predictionExportRows,
  predictionParams,
} from "../../utils/atlas";
import { genePagePath } from "../../utils/geneLinks";
import { shortSetName } from "../../utils/integrated";
import { Choice, Confidence, NeighbourMark, plural, useDebounced } from "./parts";
import styles from "./atlas-page.module.scss";

const SUPPORT_SHOWN = 6;

/** How often a prediction of a given strength is an existing annotation (from the summary). */
const Calibration = ({ calibration }) => {
  const table = useMemo(() => calibrationTable(calibration), [calibration]);
  if (table.columns.length === 0) return null;
  return (
    <details className={styles.calibration} open data-testid="atlas-calibration">
      <summary>How the confidence was measured</summary>
      <p className={styles.muted}>
        The annotation of a gene is not used for its own prediction, so every annotated gene is a test: the table gives
        the share of predictions that are an existing annotation, by the strength of the vote of the partners (−log10
        of its p-value). The confidence of a prediction is this share for its strength.
      </p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th title="-log10 of the p-value of the vote of the partners">Strength</th>
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  className={styles.num}
                  title={`${(column.tested ?? 0).toLocaleString("en-US")} predictions tested, ${(column.known ?? 0).toLocaleString("en-US")} of them an existing annotation`}
                >
                  {evidenceName(column.evidence)}
                  <br />
                  {libraryName(column.library)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.minLogP}>
                <td>{row.label}</td>
                {table.columns.map((column) => {
                  const cell = row.cells[column.key];
                  return (
                    <td
                      key={column.key}
                      className={styles.num}
                      title={cell ? `${cell.predictions.toLocaleString("en-US")} predictions of this strength` : "No prediction of this strength"}
                    >
                      {cell ? percent(cell.precision, cell.precision < 0.1 ? 1 : 0) : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};

/**
 * Predicted functions for all genes: filters, a paged table and the
 * calibration behind the confidence. Every filter and the page are in the address.
 */
const PredictionsTab = ({ query, summary }) => {
  const navigate = useNavigate();
  const { term, library, evidence, confidence, noGo, placeholder, neighbours, allTerms, page } = query;
  const [text, setText] = useState(term);
  const [state, setState] = useState({ status: "loading" }); // loading | done | error
  const settled = useDebounced(text.trim(), 350);

  const to = (changes) =>
    atlasPath({ tab: "predictions", term, library, evidence, confidence, noGo, placeholder, neighbours, allTerms, page: 1, ...changes });
  const go = (changes) => navigate(to(changes), { replace: true });

  useEffect(() => setText(term), [term]);
  useEffect(() => {
    if (settled !== term && settled === text.trim()) go({ term: settled });
    // only when the typed text has settled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, status: "loading" }));
    fetchAtlasPredictions(predictionParams({ term, library, evidence, confidence, noGo, placeholder, neighbours, allTerms, page }), {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "done", data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", message: error?.message || "The predictions could not be loaded" });
      });
    return () => controller.abort();
  }, [term, library, evidence, confidence, noGo, placeholder, neighbours, allTerms, page]);

  const data = state.data;
  const rows = data?.rows || [];
  const pages = pageCount(data?.total);
  const counts = summary?.predictions;

  return (
    <>
      <p className={styles.explain} data-testid="atlas-predictions-explain">
        For every gene, its closest partners on the two maps vote for the gene sets they belong to. A prediction says
        that the gene <strong>behaves like</strong> the genes of a set, not that it is a member: a knock-down that
        copies the loss of a complex can also be a regulator of it. <strong>Confidence</strong> is the share of equally
        strong predictions that turned out to be an existing annotation when tested on annotated genes. Annotation is
        incomplete, so it is a lower bound. Listed are functions that are not yet an annotation of the gene
        {counts ? ` (${counts.predictions.toLocaleString("en-US")} predictions for ${counts.genes.toLocaleString("en-US")} genes in total)` : ""}.
        CRISPRi can also silence a gene that shares the promoter region, so a knock-down may copy its neighbour (KIAA0586
        and TIMM9): predictions that rest on a partner in the same chromosome band are hidden unless you include them.
      </p>
      {counts?.calibration && <Calibration calibration={counts.calibration} />}

      <div className={styles.controls} data-testid="atlas-prediction-filters">
        <input
          className={styles.input}
          type="search"
          aria-label="Function contains"
          placeholder="Function contains, e.g. snRNA"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <label className={styles.control}>
          Library
          <select className={styles.select} value={library} onChange={(event) => go({ library: event.target.value })}>
            <option value="">All</option>
            {PREDICTION_LIBRARIES.map((id) => (
              <option key={id} value={id}>
                {libraryName(id)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.control}>
          Evidence
          <select className={styles.select} value={evidence} onChange={(event) => go({ evidence: event.target.value })}>
            <option value="">Both</option>
            {EVIDENCE_KINDS.map((id) => (
              <option key={id} value={id}>
                {evidenceName(id)}
              </option>
            ))}
          </select>
        </label>
        <Choice
          label="Minimum confidence"
          title="Only predictions with at least this confidence"
          choices={CONFIDENCE_CHOICES}
          value={confidence}
          format={(choice) => percent(choice)}
          onChange={(choice) => go({ confidence: choice })}
        />
      </div>
      <div className={styles.controls}>
        <label className={styles.check} title="Genes without any GO Biological Process term">
          <input type="checkbox" checked={noGo} onChange={() => go({ noGo: !noGo })} />
          Only genes without GO terms
        </label>
        <label className={styles.check} title="Genes whose name does not say what they do: open reading frames, FAM, KIAA and the like">
          <input type="checkbox" checked={placeholder} onChange={() => go({ placeholder: !placeholder })} />
          Only placeholder names
        </label>
        <label className={styles.check} title="Also list predictions that rest on a partner in the same chromosome band">
          <input type="checkbox" checked={neighbours} onChange={() => go({ neighbours: !neighbours })} />
          Include possible neighbour effects
        </label>
        <label className={styles.check} title="By default each gene is listed once, with its strongest prediction">
          <input type="checkbox" checked={allTerms} onChange={() => go({ allTerms: !allTerms })} />
          All predicted functions of a gene
        </label>
      </div>

      <div className={styles.pager}>
        <span className={styles.muted} role="status" data-testid="atlas-predictions-count">
          {state.status === "loading" && !data
            ? "Loading…"
            : `${plural(data?.total ?? 0, "prediction")} for ${plural(data?.genes ?? 0, "gene")}${pages > 1 ? ` · page ${Math.min(page, pages)} of ${pages}` : ""}`}
        </span>
        <span className={styles.headActions}>
          <button type="button" className={styles.action} disabled={page <= 1} onClick={() => navigate(to({ page: page - 1 }))}>
            Previous
          </button>
          <button type="button" className={styles.action} disabled={page >= pages} onClick={() => navigate(to({ page: page + 1 }))}>
            Next
          </button>
          <TableExportButtons
            rows={() => predictionExportRows(rows)}
            columns={PREDICTION_EXPORT_COLUMNS}
            filename={`genesetr-atlas-predictions${page > 1 ? `-page-${page}` : ""}`}
          />
        </span>
      </div>

      {state.status === "error" && (
        <div className={styles.status} role="alert">
          {state.message}
        </div>
      )}
      {state.status === "done" && rows.length === 0 && (
        <div className={styles.status} role="status">
          No prediction with these filters. Lower the minimum confidence or remove a filter.
        </div>
      )}
      {rows.length > 0 && (
        <div className={styles.card}>
          <div className={styles.scroll}>
            <table className={styles.table} data-testid="atlas-predictions">
              <thead>
                <tr>
                  <th>Gene</th>
                  <th>Predicted function</th>
                  <th>Library</th>
                  <th>Evidence</th>
                  <th className={styles.num}>Confidence</th>
                  <th title="Partners of the gene that have the function">Supporting partners</th>
                  <th className={styles.num} title="GO Biological Process terms the gene is annotated with">
                    GO terms
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const support = row.support || [];
                  return (
                    <tr key={`${row.gene}|${row.evidence}|${row.library}|${row.term}`}>
                      <td>
                        <Link className={styles.geneLink} to={genePagePath(row.gene)} title={`Open the gene page of ${row.gene}`}>
                          {row.gene}
                        </Link>
                        <Link
                          className={styles.secondaryLink}
                          to={atlasPath({ tab: "map", axis: row.evidence === "coregulation" ? "genes" : "pert", gene: row.gene, neighbours })}
                          title={`Show ${row.gene} on the ${row.evidence === "coregulation" ? "co-regulation" : "knock-down"} map`}
                        >
                          map
                        </Link>
                        {row.uncharacterised && (
                          <span className={`${styles.mark} ${styles.markWarn}`} title="The name does not say what the gene does">
                            placeholder
                          </span>
                        )}
                        {row.name && row.name !== row.gene && <div className={styles.muted}>{row.name}</div>}
                      </td>
                      <td className={styles.wrap} title={row.term}>
                        {shortSetName(row.term)}
                        {(row.neighbours || []).length > 0 && <NeighbourMark genes={row.neighbours} />}
                      </td>
                      <td>{libraryName(row.library)}</td>
                      <td>{evidenceName(row.evidence)}</td>
                      <td className={styles.num}>
                        <Confidence value={row.confidence} />
                      </td>
                      <td className={styles.wrap} title={`${row.overlap} of ${row.partners} partners: ${support.join(", ")}`}>
                        {support.slice(0, SUPPORT_SHOWN).join(", ")}
                        {support.length > SUPPORT_SHOWN && <span className={styles.muted}> +{support.length - SUPPORT_SHOWN}</span>}
                      </td>
                      <td className={styles.num}>{row.annotations ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.total > PAGE_SIZE && (
            <div className={styles.muted} style={{ marginTop: 8 }}>
              The export holds the {rows.length} rows of this page.
            </div>
          )}
        </div>
      )}
    </>
  );
};

export { PredictionsTab };
