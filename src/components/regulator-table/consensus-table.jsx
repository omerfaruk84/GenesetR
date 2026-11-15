import React, { useState } from "react";
import { Link } from "react-router-dom";
import { genePagePath } from "../../utils/geneLinks";
import { contextsText, detailEntries, detailText, rowName } from "../../utils/integrated";
import { divergingColor } from "../../utils/regulators";
import styles from "./regulator-table.module.scss";

const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

const Score = ({ value, limit }) => (
  <span className={styles.value} style={{ background: divergingColor(value, limit) }}>
    {fmt(value)}
  </span>
);

/**
 * Table of consensus results over the loss-of-function datasets (the
 * integrated analysis). A row opens to show the value in every dataset, with
 * the cell context of the dataset. Rows of the "common effects" answer
 * (`byPerturbation`) are shown with their own columns.
 *
 *   rows         rows of the integrated API ({ gene | perturbation, metaZ, datasets, support,
 *                contexts, contextsMeasured, byDataset }) or of its perturbation-set answer
 *                ({ gene, combinedZ, perturbationsMeasured, perturbationsAgreeing, byPerturbation })
 *   nameHeader   header of the name column
 *   linkTo       (name) => in-app address the name opens
 *   linkTitle    (name) => tooltip of that link
 *   names        { datasetId: name }
 *   contextOf    { datasetId: cell context }
 *   limit        meta z at which the colour of a score cell saturates
 *   detailLimit  the same for the per-dataset values
 *   compact      name, meta z and contexts only; no link to the gene page
 *   empty        text shown when there are no rows
 */
const ConsensusTable = ({
  rows,
  nameHeader = "Gene",
  linkTo = genePagePath,
  linkTitle,
  names = {},
  contextOf = {},
  limit = 10,
  detailLimit = 6,
  compact = false,
  empty = "None",
}) => {
  const [open, setOpen] = useState(null);
  if (!rows || rows.length === 0) return <div className={styles.empty}>{empty}</div>;
  const options = { names, contextOf };
  const isSet = rows[0].byPerturbation !== undefined;
  const columns = compact ? 3 : 6;

  return (
    <div className={styles.scroll}>
      <table className={`${styles.table} ${compact ? styles.compact : ""}`}>
        <thead>
          <tr>
            {!compact && <th>#</th>}
            <th>{nameHeader}</th>
            {isSet ? (
              <>
                <th className={styles.num} title="Consensus effect of the listed perturbations on this gene">
                  Combined z
                </th>
                <th className={styles.num} title="Listed perturbations in which this gene is measured">
                  Measured
                </th>
                <th className={styles.num} title="Listed perturbations that change this gene in the same direction">
                  Agreeing
                </th>
              </>
            ) : (
              <>
                <th className={styles.num} title="Sum of the z-scores of the datasets that have this pair, divided by the square root of their number">
                  Meta z
                </th>
                {!compact && (
                  <th className={styles.num} title="Datasets that have this pair">
                    Datasets
                  </th>
                )}
                {!compact && (
                  <th className={styles.num} title="Datasets that show the effect on their own: |z| of at least 2 with the same sign">
                    Supporting
                  </th>
                )}
                <th className={styles.num} title="Distinct cell contexts among the supporting datasets, of the cell contexts that have this pair">
                  Contexts
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const name = rowName(row);
            const expanded = open === name;
            return (
              <React.Fragment key={name}>
                <tr className={expanded ? styles.rowOpen : undefined} title={expanded ? undefined : detailText(row, options)}>
                  {!compact && <td className={styles.rank}>{index + 1}</td>}
                  <td className={styles.tf}>
                    <button
                      type="button"
                      className={styles.toggle}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} the values of ${name} in each ${isSet ? "perturbation" : "dataset"}`}
                      onClick={() => setOpen(expanded ? null : name)}
                    >
                      {expanded ? "▾" : "▸"}
                    </button>
                    <Link className={styles.geneLink} to={linkTo(name)} title={linkTitle ? linkTitle(name) : undefined}>
                      {name}
                    </Link>
                    {!compact && (
                      <Link className={styles.secondaryLink} to={genePagePath(name)} title={`Open the gene page of ${name}`}>
                        gene page
                      </Link>
                    )}
                  </td>
                  {isSet ? (
                    <>
                      <td className={styles.num}>
                        <Score value={row.combinedZ} limit={limit} />
                      </td>
                      <td className={styles.num}>{row.perturbationsMeasured ?? "–"}</td>
                      <td className={styles.num}>{row.perturbationsAgreeing ?? "–"}</td>
                    </>
                  ) : (
                    <>
                      <td className={styles.num}>
                        <Score value={row.metaZ} limit={limit} />
                      </td>
                      {!compact && <td className={styles.num}>{row.datasets ?? "–"}</td>}
                      {!compact && <td className={styles.num}>{row.support ?? "–"}</td>}
                      <td className={styles.num}>{contextsText(row)}</td>
                    </>
                  )}
                </tr>
                {expanded && (
                  <tr className={styles.detailRow}>
                    <td colSpan={columns}>
                      <div className={styles.detail}>
                        {detailEntries(row, options).map((entry) => (
                          <span key={entry.key} className={styles.detailItem}>
                            <span className={styles.detailName}>
                              {entry.name}
                              {entry.context ? ` · ${entry.context}` : ""}
                            </span>
                            <Score value={entry.value} limit={detailLimit} />
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export { ConsensusTable };
