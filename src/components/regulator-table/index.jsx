import React, { useState } from "react";
import { Link } from "react-router-dom";
import { genePagePath } from "../../utils/geneLinks";
import { byDatasetRows, byDatasetText, callTone, divergingColor } from "../../utils/regulators";
import styles from "./regulator-table.module.scss";

const fmt = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "–";

const Score = ({ value, limit, title }) => (
  <span className={styles.value} style={{ background: divergingColor(value, limit) }} title={title}>
    {fmt(value)}
  </span>
);

/**
 * Table of transcription factors with their evidence from overexpression and
 * from knock-down. A row opens to show the value in every dataset.
 *
 *   rows          rows of the regulators API ({ tf, call, gain, loss, lossDatasets, combined, byDataset })
 *   names         { datasetId: name }
 *   gainDatasets  ids of the overexpression datasets (listed first in the details)
 *   limit         value at which the colour of a score cell saturates
 *   compact       leaves out the rank and the combined score; shorter headers
 *   hideGain      leaves out the overexpression column (a gene without overexpression data)
 *   callLabel     text shown for a call (default: the call as the API gives it)
 *   callHeader    header of the call column
 *   empty         text shown when there are no rows
 */
const RegulatorTable = ({
  rows,
  names = {},
  gainDatasets = [],
  limit = 6,
  compact = false,
  empty = "None",
  hideGain = false,
  callLabel = (call) => call,
  callHeader = "Call",
}) => {
  const [open, setOpen] = useState(null);
  if (!rows || rows.length === 0) return <div className={styles.empty}>{empty}</div>;
  const options = { names, gainDatasets };
  const columns = (compact ? 5 : 7) - (hideGain ? 1 : 0);

  return (
    <div className={styles.scroll}>
      <table className={`${styles.table} ${compact ? styles.compact : ""}`}>
        <thead>
          <tr>
            {!compact && <th>#</th>}
            <th>TF</th>
            <th>{callHeader}</th>
            {!hideGain && (
              <th className={styles.num} title="Effect when the TF is overexpressed (TF Atlas)">
                {compact ? "Overexpr." : "Overexpression"}
              </th>
            )}
            <th className={styles.num} title="Effect when the TF is knocked down or knocked out, combined over the datasets that perturb it">
              Knock-down
            </th>
            <th className={styles.num} title="Number of knock-down datasets behind the knock-down score">
              {compact ? "n" : "Datasets"}
            </th>
            {!compact && (
              <th className={styles.num} title="Evidence for activation: overexpression score minus knock-down score, combined. Negative means repression.">
                Combined
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const expanded = open === row.tf;
            return (
              <React.Fragment key={row.tf}>
                <tr className={expanded ? styles.rowOpen : undefined} title={expanded ? undefined : byDatasetText(row, options)}>
                  {!compact && <td className={styles.rank}>{index + 1}</td>}
                  <td className={styles.tf}>
                    <button
                      type="button"
                      className={styles.toggle}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} the values of ${row.tf} in each dataset`}
                      onClick={() => setOpen(expanded ? null : row.tf)}
                    >
                      {expanded ? "▾" : "▸"}
                    </button>
                    <Link className={styles.geneLink} to={genePagePath(row.tf)} title={`Open the gene page of ${row.tf}`}>
                      {row.tf}
                    </Link>
                  </td>
                  <td>
                    <span className={`${styles.call} ${styles[callTone(row.call)]}`} title={row.call}>
                      {callLabel(row.call)}
                    </span>
                  </td>
                  {!hideGain && (
                    <td className={styles.num}>
                      {row.gain === null || row.gain === undefined ? (
                        <span className={styles.muted} title="Not measured in the overexpression dataset">–</span>
                      ) : (
                        <Score value={row.gain} limit={limit} />
                      )}
                    </td>
                  )}
                  <td className={styles.num}>
                    {row.loss === null || row.loss === undefined ? (
                      <span className={styles.muted} title="Not knocked down in a dataset that measures this">–</span>
                    ) : (
                      <Score value={row.loss} limit={limit} />
                    )}
                  </td>
                  <td className={styles.num}>{row.lossDatasets ?? "–"}</td>
                  {!compact && (
                    <td className={styles.num}>
                      <Score value={row.combined} limit={limit} />
                    </td>
                  )}
                </tr>
                {expanded && (
                  <tr className={styles.detailRow}>
                    <td colSpan={columns}>
                      <div className={styles.detail}>
                        {byDatasetRows(row, options).map((entry) => (
                          <span key={entry.dataset} className={styles.detailItem}>
                            <span className={styles.detailName}>
                              {entry.name}
                              {entry.direction === "gain" ? " (overexpression)" : ""}
                            </span>
                            <Score value={entry.value} limit={limit} />
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

export { RegulatorTable };
