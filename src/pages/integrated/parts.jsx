import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { LocalEnrichment } from "../../components/local-enrichment";
import { ConsensusTable } from "../../components/regulator-table/consensus-table";
import { SendToMenu } from "../../components/send-to";
import { genePagePath } from "../../utils/geneLinks";
import {
  CONSENSUS_EXPORT_COLUMNS,
  MIN_CONTEXT_CHOICES,
  ROW_CHOICES,
  SET_EXPORT_COLUMNS,
  consensusExportRows,
  formatQ,
  integratedPath,
  rowName,
  shortSetName,
} from "../../utils/integrated";
import { divergingColor } from "../../utils/regulators";
import { listGeneLists, useWorkspaceVersion } from "../../utils/workspace";
import styles from "./integrated-page.module.scss";

export const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

const slug = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const Score = ({ value, limit = 6, digits = 2 }) => (
  <span className={styles.value} style={{ background: divergingColor(value, limit) }}>
    {fmt(value, digits)}
  </span>
);

/** Address of the gene mode for a name, as a perturbation or as a measured gene. */
export const geneModeLink = (view, controls) => (name) => integratedPath({ mode: "gene", symbol: name, view, ...controls });

/** The gene lists saved in the workspace, kept up to date. */
export const useSavedLists = () => {
  const [savedLists, setSavedLists] = useState([]);
  const workspaceVersion = useWorkspaceVersion();
  useEffect(() => {
    let current = true;
    listGeneLists()
      .then((lists) => {
        if (current) setSavedLists(lists);
      })
      .catch(() => {
        if (current) setSavedLists([]);
      });
    return () => {
      current = false;
    };
  }, [workspaceVersion]);
  return savedLists;
};

/** One list box with the menu of saved lists. */
export const ListBox = ({ id, label, box, hint, value, count, onChange, savedLists, onLoad }) => (
  <div className={styles.listBox}>
    <div className={styles.listHead}>
      <label htmlFor={id}>{label}</label>
      <span className={styles.muted}>{plural(count, "gene")}</span>
    </div>
    <textarea
      id={id}
      className={styles.textarea}
      value={value}
      spellCheck={false}
      placeholder={hint}
      onChange={(event) => onChange(event.target.value)}
    />
    <select
      className={styles.select}
      value=""
      aria-label={`Load a saved gene list (${box} list)`}
      disabled={savedLists.length === 0}
      onChange={(event) => onLoad(savedLists.find((list) => list.id === event.target.value))}
    >
      <option value="">{savedLists.length === 0 ? "No saved gene lists yet" : "Load a saved gene list…"}</option>
      {savedLists.map((list) => (
        <option key={list.id} value={list.id}>
          {list.name} ({list.count})
        </option>
      ))}
    </select>
  </div>
);

const Choice = ({ label, title, choices, value, onChange }) => (
  <span className={styles.control} title={title}>
    {label}
    {choices.map((choice) => (
      <button
        key={choice}
        type="button"
        className={choice === value ? styles.chipActive : styles.chip}
        aria-pressed={choice === value}
        aria-label={`${label} ${choice}`}
        onClick={() => onChange(choice)}
      >
        {choice}
      </button>
    ))}
  </span>
);

/** Minimum number of contexts and number of rows; `onChange({ minContexts, rows })`. */
export const Controls = ({ minContexts, rows, onChange, withContexts = true }) => (
  <div className={styles.controls}>
    {withContexts && (
      <Choice
        label="Minimum contexts"
        title="A row is listed only when at least this many distinct cell contexts show the effect on their own"
        choices={MIN_CONTEXT_CHOICES}
        value={minContexts}
        onChange={(value) => onChange({ minContexts: value, rows })}
      />
    )}
    <Choice
      label="Rows"
      title="Rows shown per table"
      choices={ROW_CHOICES}
      value={rows}
      onChange={(value) => onChange({ minContexts, rows: value })}
    />
  </div>
);

/** What the columns mean and what they cannot show; `children` is the sentence specific to a mode. */
export const Explain = ({ summary, children }) => {
  const datasets = summary?.datasets?.length;
  const contexts = summary ? Object.keys(summary.contexts || {}).length : 0;
  return (
    <p className={styles.explain} data-testid="integrated-explain">
      {children}{" "}
      <strong>Meta z</strong> combines the z-scores of the loss-of-function datasets (CRISPRi and knock-out
      {datasets ? `; ${datasets} datasets in ${contexts} cell contexts` : ""}) that have the pair: their sum divided by
      the square root of their number. <strong>Datasets</strong> is how many have the pair, <strong>Supporting</strong>{" "}
      how many of them show the effect on their own (|z| ≥ {summary?.supportZ ?? 2}, same sign), and{" "}
      <strong>Contexts</strong> in how many distinct cell types the supporting datasets are, out of the cell types that
      have the pair. Several datasets share a cell type, so the number of contexts is the honest count of
      reproductions. An effect that is missing in a small screen is not evidence of absence: small screens perturb and
      measure fewer genes. Open a row for the value in each dataset.
    </p>
  );
};

/**
 * A result table with its heading, "Send to" and export buttons.
 *   rows       consensus rows or rows of the perturbation-set answer
 *   sendLabel  text of the "Send to" button
 */
export const ResultCard = ({
  testId,
  title,
  hint,
  rows,
  nameHeader,
  linkTo,
  linkTitle,
  names,
  contextOf,
  empty,
  sendLabel = "Send the genes to…",
  exclude = [],
  limit,
  detailLimit,
}) => {
  const list = rows || [];
  const isSet = list.length > 0 && list[0].byPerturbation !== undefined;
  return (
    <div className={styles.tableCard} data-testid={testId}>
      <div className={styles.tableHead}>
        <div>
          <h3>{title}</h3>
          {hint && <div className={styles.muted}>{hint}</div>}
        </div>
        {list.length > 0 && (
          <div className={styles.headActions}>
            <SendToMenu genes={list.map(rowName)} label={sendLabel} defaultName={`Integrated: ${title}`} exclude={exclude} drugs={false} />
            <TableExportButtons
              rows={() => consensusExportRows(list, title)}
              columns={isSet ? SET_EXPORT_COLUMNS : CONSENSUS_EXPORT_COLUMNS}
              filename={`genesetr-integrated-${slug(title)}`}
            />
          </div>
        )}
      </div>
      <ConsensusTable
        rows={list}
        nameHeader={nameHeader}
        linkTo={linkTo}
        linkTitle={linkTitle}
        names={names}
        contextOf={contextOf}
        empty={empty}
        limit={limit}
        detailLimit={detailLimit}
      />
      {list.length > 0 && (
        <div className={styles.below}>
          <LocalEnrichment
            genes={list.map(rowName)}
            label={`Enrichment of these ${list.length} genes`}
            filename={`genesetr-integrated-enrichment-${slug(title)}`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * "Pathways affected": gene sets whose genes go up or down over the whole
 * consensus profile of a perturbation (`libraries` of the pathways answer).
 */
export const PathwaysBlock = ({ symbol, data }) => {
  const libraries = Object.entries(data?.libraries || {});
  const [library, setLibrary] = useState("");
  if (libraries.length === 0) return null;
  const current = libraries.find(([id]) => id === library) || libraries[0];
  const [, entry] = current;
  const exportRows = () =>
    libraries.flatMap(([, lib]) =>
      ["up", "down"].flatMap((direction) =>
        (lib[direction] || []).map((row) => ({ ...row, library: lib.name, direction, genes: (row.genes || []).join(";") }))
      )
    );
  return (
    <div className={`${styles.tableCard} ${styles.block}`} data-testid="integrated-pathways">
      <div className={styles.tableHead}>
        <div>
          <h3>Pathways affected</h3>
          <div className={styles.muted}>
            Gene sets whose genes go up or down over the whole consensus profile of the {symbol} knock-down (
            {(data.genes ?? 0).toLocaleString("en-US")} genes). The q-values are optimistic because the genes of a
            pathway are co-regulated; read the tables as a ranking.
          </div>
        </div>
        <div className={styles.headActions}>
          {libraries.map(([id, lib]) => (
            <button
              key={id}
              type="button"
              className={id === current[0] ? styles.chipActive : styles.chip}
              aria-pressed={id === current[0]}
              onClick={() => setLibrary(id)}
            >
              {lib.name}
            </button>
          ))}
          <TableExportButtons
            rows={exportRows}
            columns={[
              { accessorKey: "library", header: "Library" },
              { accessorKey: "direction", header: "Direction" },
              { accessorKey: "set", header: "Gene set" },
              { accessorKey: "setSize", header: "Set size" },
              { accessorKey: "z", header: "z" },
              { accessorKey: "meanZ", header: "Mean meta z of the genes" },
              { accessorKey: "q", header: "q" },
              { accessorKey: "genes", header: "Leading genes" },
            ]}
            filename={`genesetr-integrated-pathways-${symbol}`}
          />
        </div>
      </div>
      <div className={styles.pathwayPair}>
        {[
          { key: "up", title: `Up when ${symbol} is knocked down` },
          { key: "down", title: `Down when ${symbol} is knocked down` },
        ].map((group) => {
          const rows = entry[group.key] || [];
          return (
            <div key={group.key} className={styles.scroll} data-testid={`integrated-pathways-${group.key}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{group.title}</th>
                    <th className={styles.num} title="Genes in the set">
                      Size
                    </th>
                    <th className={styles.num} title="Score of the set against the rest of the profile">
                      z
                    </th>
                    <th className={styles.num} title="Optimistic: the genes of a pathway are co-regulated">
                      q
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className={styles.muted}>
                        None of {entry.tested} sets
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.set} title={`${row.set}. Leading genes: ${(row.genes || []).join(", ")}`}>
                      <td>{shortSetName(row.set)}</td>
                      <td className={styles.num}>{row.setSize}</td>
                      <td className={styles.num}>
                        <Score value={row.z} limit={10} />
                      </td>
                      <td className={styles.num}>{formatQ(row.q)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Effects seen in one cell context and not in the others (`contextSpecific` of the API). */
export const ContextSpecificCard = ({ testId, title, hint, rows, nameHeader, linkTo }) => {
  const list = rows || [];
  return (
    <div className={styles.tableCard} data-testid={testId}>
      <div className={styles.tableHead}>
        <div>
          <h3>{title}</h3>
          <div className={styles.muted}>{hint}</div>
        </div>
        {list.length > 0 && (
          <TableExportButtons
            rows={list}
            columns={[
              { accessorKey: "label", header: nameHeader },
              { accessorKey: "context", header: "Context" },
              { accessorKey: "z", header: "z in this context" },
              { accessorKey: "restZ", header: "Combined z in the other contexts" },
              { accessorKey: "otherContexts", header: "Other contexts" },
            ]}
            filename={`genesetr-integrated-${slug(title)}`}
          />
        )}
      </div>
      {list.length === 0 ? (
        <div className={styles.muted}>None</div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{nameHeader}</th>
                <th>Context</th>
                <th className={styles.num} title="Combined z-score of the datasets of this cell context">
                  z here
                </th>
                <th className={styles.num} title="Combined z-score of the datasets of all other cell contexts">
                  z elsewhere
                </th>
                <th className={styles.num} title="Number of other cell contexts that have this pair">
                  Other contexts
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={`${row.label}|${row.context}`}>
                  <td>
                    <Link className={styles.geneLink} to={linkTo(row.label)}>
                      {row.label}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.tag}>{row.context}</span>
                  </td>
                  <td className={styles.num}>
                    <Score value={row.z} limit={10} />
                  </td>
                  <td className={styles.num}>
                    <Score value={row.restZ} limit={10} />
                  </td>
                  <td className={styles.num}>{row.otherContexts ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * Evidence from the gain-of-function datasets (TF overexpression), shown beside
 * the loss-of-function consensus and never mixed into it.
 *   overexpression  { datasetId: { [key]: [{ perturbation, z }] } }
 *   groups          [{ key, title }] - the two directions
 */
export const OverexpressionCards = ({ overexpression, groups, names, subject }) => {
  const entries = Object.entries(overexpression || {});
  if (entries.length === 0) {
    return (
      <p className={styles.muted} data-testid="integrated-overexpression-none">
        No overexpression evidence: {subject} not measured in the TF Atlas.
      </p>
    );
  }
  return (
    <div className={styles.pair} data-testid="integrated-overexpression">
      {entries.flatMap(([dataset, lists]) =>
        groups.map((group) => {
          const rows = lists?.[group.key] || [];
          return (
            <div key={`${dataset}|${group.key}`} className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div>
                  <h3>{group.title}</h3>
                  <div className={styles.muted}>{names[dataset] || dataset}: the TF is overexpressed, not knocked down</div>
                </div>
                {rows.length > 0 && (
                  <div className={styles.headActions}>
                    <SendToMenu genes={rows.map((row) => row.perturbation)} label="Send the TFs to…" defaultName={`Integrated: ${group.title}`} drugs={false} />
                    <TableExportButtons
                      rows={rows}
                      columns={[
                        { accessorKey: "perturbation", header: "Overexpressed TF" },
                        { accessorKey: "z", header: "z" },
                      ]}
                      filename={`genesetr-integrated-${slug(group.title)}`}
                    />
                  </div>
                )}
              </div>
              {rows.length === 0 ? (
                <div className={styles.muted}>None</div>
              ) : (
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Overexpressed TF</th>
                        <th className={styles.num}>z</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.perturbation}>
                          <td>
                            <Link className={styles.geneLink} to={genePagePath(row.perturbation)} title={`Open the gene page of ${row.perturbation}`}>
                              {row.perturbation}
                            </Link>
                          </td>
                          <td className={styles.num}>
                            <Score value={row.z} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
