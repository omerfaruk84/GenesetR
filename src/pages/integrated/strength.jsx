import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { fetchIntegratedProfile } from "../../store/api/integrated";
import { fdrLabel, formatQ, profileRows } from "../../utils/integrated";
import { Score } from "./parts";
import styles from "./integrated-page.module.scss";

const PROFILE_ROWS = 25;

const count = (value) => (typeof value === "number" ? Math.round(value).toLocaleString("en-US") : "–");

// A gene missing from the measured genes was not detected in enough cells. Usually it is not expressed,
// and its knock-down does nothing; a few such genes are expressed at a low level and do have an effect.
const NOT_EXPRESSED = "not measured here: little or no effect expected";

/** One knock-down in one dataset: the genes that change at a false discovery rate of 5 %. */
const DatasetProfile = ({ symbol, dataset, name, linkTo }) => {
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    setAnswer(null);
    const controller = new AbortController();
    fetchIntegratedProfile(symbol, dataset, { topN: PROFILE_ROWS, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol, dataset]);

  if (!answer) {
    return (
      <div className={styles.muted} role="status">
        Reading {symbol} in {name}…
      </div>
    );
  }
  if (answer.status !== "found") {
    return (
      <div className={styles.muted} role="alert">
        {answer.status === "error" ? answer.message : `The genes of ${symbol} in ${name} could not be read.`}
      </div>
    );
  }

  const profile = answer.data;
  const lists = profileRows(profile);
  const rate = fdrLabel(profile.fdr);
  const cut = (profile.significantUp ?? 0) > lists.up.length || (profile.significantDown ?? 0) > lists.down.length;
  const exportRows = () =>
    ["up", "down"].flatMap((direction) => lists[direction].map((row) => ({ direction, gene: row.gene, z: row.z, q: row.q ?? "" })));

  return (
    <div className={styles.profile} data-testid="integrated-profile">
      <div className={styles.tableHead}>
        <div className={styles.muted}>
          <strong>
            {count(profile.significant)} of {count(profile.genesMeasured)} measured genes
          </strong>{" "}
          change at FDR {rate} when {symbol} is perturbed in {name}: {count(profile.significantUp)} up,{" "}
          {count(profile.significantDown)} down.
          {cut ? ` The ${PROFILE_ROWS} strongest of each direction are listed.` : ""}
          {profile.corrected ? "" : " This dataset has no correction for technical variation."}
          {profile.expressed === false ? ` ${symbol} itself is ${NOT_EXPRESSED}.` : ""}
        </div>
        {profile.significant > 0 && (
          <TableExportButtons
            rows={exportRows}
            columns={[
              { accessorKey: "direction", header: "Direction" },
              { accessorKey: "gene", header: "Gene" },
              { accessorKey: "z", header: "z" },
              { accessorKey: "q", header: "q" },
            ]}
            filename={`genesetr-integrated-${symbol}-in-${dataset}`}
          />
        )}
      </div>
      {profile.significant > 0 && (
        <div className={styles.pathwayPair}>
          {[
            { key: "up", title: "Go up" },
            { key: "down", title: "Go down" },
          ].map((group) => (
            <div key={group.key} className={styles.scroll} data-testid={`integrated-profile-${group.key}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{group.title}</th>
                    <th className={styles.num} title="z-score of the gene in this knock-down, in this dataset">
                      z
                    </th>
                    <th className={styles.num} title="False discovery rate (Benjamini-Hochberg over the genes of this profile)">
                      q
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lists[group.key].length === 0 && (
                    <tr>
                      <td colSpan={3} className={styles.muted}>
                        None
                      </td>
                    </tr>
                  )}
                  {lists[group.key].map((row) => (
                    <tr key={row.gene}>
                      <td>
                        <Link className={styles.geneLink} to={linkTo(row.gene)} title={`What controls ${row.gene} everywhere?`}>
                          {row.gene}
                        </Link>
                      </td>
                      <td className={styles.num}>
                        <Score value={row.z} limit={10} />
                      </td>
                      <td className={styles.num}>{formatQ(row.q)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * "Strength per dataset": how strong the knock-down of a gene is in every
 * dataset that perturbs it. A row opens to the genes that change in that dataset.
 *   strength   rows of the API ({ dataset, cells, self_z, genes_strong, genes_fdr, genes_measured, impact, inert })
 *   linkTo     (gene) => address a listed gene opens
 */
const StrengthCard = ({ symbol, strength, names, contextOf, linkTo, fdr }) => {
  const [open, setOpen] = useState(null);
  useEffect(() => setOpen(null), [symbol]);
  const rate = fdrLabel(fdr);
  const columns = 7;

  return (
    <div className={styles.tableCard} data-testid="integrated-strength">
      <div className={styles.tableHead}>
        <div>
          <h3>Strength per dataset</h3>
          <div className={styles.muted}>
            On-target z is the z-score of {symbol} itself. Impact is the mean squared z over all measured genes minus 1:
            about 0 for a perturbation without effect. Open a row for the genes that change in that dataset.
          </div>
        </div>
        <TableExportButtons
          rows={() =>
            strength.map((row) => ({
              ...row,
              name: names[row.dataset] || row.dataset,
              context: contextOf[row.dataset] || "",
              expressed: row.inert ? "no" : "yes",   // column "Gene measured in the dataset"
            }))
          }
          columns={[
            { accessorKey: "dataset", header: "Dataset id" },
            { accessorKey: "name", header: "Dataset" },
            { accessorKey: "context", header: "Context" },
            { accessorKey: "expressed", header: "Gene measured in the dataset" },
            { accessorKey: "cells", header: "Cells" },
            { accessorKey: "self_z", header: "On-target z" },
            { accessorKey: "genes_strong", header: "Strongly changed genes" },
            { accessorKey: "genes_fdr", header: `Genes at FDR ${rate}` },
            { accessorKey: "genes_measured", header: "Genes measured" },
            { accessorKey: "impact", header: "Impact" },
          ]}
          filename={`genesetr-integrated-strength-${symbol}`}
        />
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Context</th>
              <th className={styles.num} title="Cells that carry the perturbation, where the dataset reports it">
                Cells
              </th>
              <th className={styles.num}>On-target z</th>
              <th className={styles.num} title="Measured genes with |z| of at least 3">
                Strongly changed genes
              </th>
              <th className={styles.num} title={`Measured genes that change at a false discovery rate of ${rate} within this knock-down`}>
                Genes at FDR {rate}
              </th>
              <th className={styles.num}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {strength.map((row) => {
              const name = names[row.dataset] || row.dataset;
              const expanded = open === row.dataset;
              return (
                <React.Fragment key={row.dataset}>
                  <tr className={expanded ? styles.rowOpen : undefined} data-dataset={row.dataset}>
                    <td>
                      <button
                        type="button"
                        className={styles.toggle}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} the genes that change in ${name}`}
                        onClick={() => setOpen(expanded ? null : row.dataset)}
                      >
                        {expanded ? "▾" : "▸"}
                      </button>
                      {name}
                      {row.inert && (
                        <span
                          className={`${styles.mark} ${styles.markWarn}`}
                          data-testid="not-expressed"
                          title={`${symbol} is not among the measured genes of this dataset: it was not detected in enough cells. If it is not expressed there, its knock-down does nothing; the number of genes at FDR 5 % shows whether it does`}
                        >
                          {NOT_EXPRESSED}
                        </span>
                      )}
                    </td>
                    <td>{contextOf[row.dataset] ? <span className={styles.tag}>{contextOf[row.dataset]}</span> : "–"}</td>
                    <td className={styles.num}>{count(row.cells)}</td>
                    <td className={styles.num}>{typeof row.self_z === "number" ? <Score value={row.self_z} limit={10} /> : "–"}</td>
                    <td className={styles.num}>
                      {row.genes_strong ?? "–"}
                      {row.genes_measured ? <span className={styles.muted}> of {row.genes_measured.toLocaleString("en-US")}</span> : ""}
                    </td>
                    <td className={styles.num}>{row.genes_fdr ?? "–"}</td>
                    <td className={styles.num}>{typeof row.impact === "number" ? row.impact.toFixed(3) : "–"}</td>
                  </tr>
                  {expanded && (
                    <tr className={styles.detailRow}>
                      <td colSpan={columns}>
                        <DatasetProfile symbol={symbol} dataset={row.dataset} name={name} linkTo={linkTo} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export { StrengthCard };
