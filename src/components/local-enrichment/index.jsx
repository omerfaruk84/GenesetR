import React, { useEffect, useState } from "react";
import { fetchLocalEnrichment } from "../../store/api/enrichment";
import { formatQ, shortSetName } from "../../utils/integrated";
import { TableExportButtons } from "../export-buttons";
import styles from "./local-enrichment.module.scss";

const MIN_GENES = 3;

const EXPORT_COLUMNS = [
  { accessorKey: "library", header: "Library" },
  { accessorKey: "set", header: "Gene set" },
  { accessorKey: "overlap", header: "Overlap" },
  { accessorKey: "setSize", header: "Set size" },
  { accessorKey: "fold", header: "Fold enrichment" },
  { accessorKey: "p", header: "p" },
  { accessorKey: "q", header: "q" },
  { accessorKey: "genes", header: "Genes" },
];

/**
 * "Enrichment" for a gene list: over-representation in the gene-set libraries
 * of the API (Hallmark, Reactome, GO, CORUM), computed by the API itself.
 * The request is made when the block is opened for the first time, and again
 * when the list changes while it is open.
 *
 *   genes     array of symbols
 *   label     button text
 *   filename  base name of the exported table
 */
const LocalEnrichment = ({ genes, label = "Enrichment", filename = "genesetr-enrichment" }) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [library, setLibrary] = useState("");
  const key = (genes || []).join(",");

  useEffect(() => {
    if (!open || !key) return undefined;
    const controller = new AbortController();
    setState("loading");
    setError("");
    fetchLocalEnrichment({ genes: key.split(","), signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult(data);
        setState("done");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message || "The enrichment failed");
        setState("error");
      });
    return () => controller.abort();
  }, [open, key]);

  if (!genes || genes.length < MIN_GENES) return null;

  const libraries = Object.entries(result?.libraries || {});
  // The chosen library, or the first one that has a result
  const current =
    libraries.find(([id]) => id === library) || libraries.find(([, entry]) => (entry.sets || []).length > 0) || libraries[0];
  const sets = current ? current[1].sets || [] : [];
  const exportRows = () =>
    libraries.flatMap(([, entry]) =>
      (entry.sets || []).map((row) => ({ ...row, library: entry.name, genes: (row.genes || []).join(";") }))
    );

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        title="Gene sets that are over-represented in this list (computed by GeneSetR, no external service)"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <div className={styles.block} data-testid="local-enrichment">
          {state === "loading" && (
            <div className={styles.muted} role="status">
              Testing the gene sets…
            </div>
          )}
          {state === "error" && (
            <div className={styles.muted} role="alert">
              {error}
            </div>
          )}
          {state === "done" && current && (
            <>
              <div className={styles.head}>
                {libraries.map(([id, entry]) => (
                  <button
                    key={id}
                    type="button"
                    className={id === current[0] ? styles.chipActive : styles.chip}
                    aria-pressed={id === current[0]}
                    onClick={() => setLibrary(id)}
                  >
                    {entry.name} ({(entry.sets || []).length})
                  </button>
                ))}
                <TableExportButtons rows={exportRows} columns={EXPORT_COLUMNS} filename={filename} />
              </div>
              <div className={styles.muted}>
                Over-representation of the {current[1].queryGenes ?? result.genes} genes of this list among{" "}
                {(current[1].background ?? 0).toLocaleString("en-US")} background genes
                {result.backgroundSource ? ` (${result.backgroundSource})` : ""}; {current[1].tested} sets tested.
              </div>
              {sets.length === 0 ? (
                <div className={styles.muted}>No gene set of this library is over-represented.</div>
              ) : (
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Gene set</th>
                        <th className={styles.num} title="Genes of the list in the set / genes in the set">
                          Overlap
                        </th>
                        <th className={styles.num} title="Observed overlap divided by the overlap expected by chance">
                          Fold
                        </th>
                        <th className={styles.num} title="p-value corrected for the number of sets tested">
                          q
                        </th>
                        <th>Genes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((row) => (
                        <tr key={row.set}>
                          <td title={row.set}>{shortSetName(row.set)}</td>
                          <td className={styles.num}>
                            {row.overlap} / {row.setSize}
                          </td>
                          <td className={styles.num}>{typeof row.fold === "number" ? row.fold.toFixed(1) : "–"}</td>
                          <td className={styles.num}>{formatQ(row.q)}</td>
                          <td className={styles.genes} title={(row.genes || []).join(", ")}>
                            {(row.genes || []).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export { LocalEnrichment };
