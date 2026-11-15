import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { fetchAtlasSimilarity } from "../../store/api/atlas";
import {
  ATLAS_AXES,
  EVIDENCE_TEXT,
  MAX_LIST_GENES,
  MIN_LIST_GENES,
  atlasPath,
  similarityExport,
  similarityHeatmap,
} from "../../utils/atlas";
import { rgba } from "../../utils/chartStyle";
import { useChartTheme } from "../../utils/chartTheme";
import { EXAMPLE_ATLAS_LISTS, EXAMPLE_GENE_SETS } from "../../utils/examples";
import { parseSymbols } from "../../utils/regulators";
import { plural } from "./parts";
import { SimilarityHeatmap } from "./similarity-heatmap";
import styles from "./atlas-page.module.scss";

const EXAMPLES = [...EXAMPLE_ATLAS_LISTS, ...EXAMPLE_GENE_SETS.filter((example) => ["mtorc1", "isr-upr"].includes(example.id))];

const MISSING_SHOWN = 40;

/** What the colours of the heatmap stand for. */
const ColourKey = ({ axis, limit }) => {
  const { p } = useChartTheme();
  const swatch = (color) => <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />;
  return (
    <div className={styles.legend} data-testid="atlas-similarity-key">
      <span>
        {swatch(rgba(p.upRgb, 1))} {axis === "pert" ? "similar: the two knock-downs have the same consequences" : "similar: the two genes respond alike"}
      </span>
      <span>{swatch(rgba(p.downRgb, 1))} opposite</span>
      <span>{swatch(p.surface)} unrelated</span>
      <span>
        <span className={`${styles.swatch} ${styles.swatchEmpty}`} aria-hidden="true" /> no dataset has both genes
      </span>
      <span>The strongest colour stands for a mean correlation of {limit.toFixed(2)} or more.</span>
    </div>
  );
};

/**
 * The gene list tab: a pasted list (or one sent from another module) as a
 * clustered heatmap of the consensus similarity among its genes. The list
 * and the kind of evidence are in the address.
 */
const ListTab = ({ query }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { axis } = query;
  const words = EVIDENCE_TEXT[axis];
  const genesKey = query.genes.join(",");

  const [text, setText] = useState(query.genes.join("\n"));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: "idle" }); // idle | loading | done | error

  const typed = useMemo(() => parseSymbols(text), [text]);
  const canShow = typed.length >= MIN_LIST_GENES && typed.length <= MAX_LIST_GENES;

  // the box follows the address: a shared link, an example, or a list sent from another module
  useEffect(() => {
    if (genesKey) setText(genesKey.split(",").join("\n"));
  }, [genesKey]);

  useEffect(() => {
    const genes = genesKey ? genesKey.split(",") : [];
    if (genes.length < MIN_LIST_GENES) {
      setState({ status: "idle" });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchAtlasSimilarity(genes, axis, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "done", data, axis });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", message: error?.message || "The similarity could not be read" });
      });
    return () => controller.abort();
  }, [genesKey, axis, attempt]);

  const show = () => {
    const path = atlasPath({ tab: "list", axis, genes: typed });
    if (path === `${location.pathname}${location.search}`) setAttempt((value) => value + 1);
    else navigate(path);
  };

  const data = state.status === "done" ? state.data : null;
  const heat = useMemo(() => (data ? similarityHeatmap(data) : null), [data]);
  const table = useMemo(() => (data && heat ? similarityExport(data, heat.order) : null), [data, heat]);
  const missing = data?.missing || [];
  const file = `genesetr-atlas-similarity-${axis === "pert" ? "knock-downs" : "co-regulation"}`;

  return (
    <>
      <p className={styles.explain} data-testid="atlas-list-explain">
        <strong>Which genes of a list act together?</strong> Paste a gene list and choose the evidence: how alike the
        knock-downs of two genes are, or how alike the two genes respond to perturbations. Each pair gets one value
        that combines all datasets that have both genes. The heatmap puts similar genes next to each other, so
        complexes and pathways show as blocks.
      </p>
      <div className={styles.listLayout}>
        <section className={styles.card}>
          <div className={styles.listHead}>
            <label htmlFor="atlas-gene-list">Gene list</label>
            <span className={styles.muted}>{plural(typed.length, "gene")}</span>
          </div>
          <textarea
            id="atlas-gene-list"
            className={styles.textarea}
            value={text}
            spellCheck={false}
            placeholder={"INTS1\nINTS2\nMED12"}
            onChange={(event) => setText(event.target.value)}
          />
          <div className={styles.muted}>
            Gene symbols separated by spaces, commas, semicolons or new lines; {MIN_LIST_GENES} to {MAX_LIST_GENES} genes.
          </div>
          <div className={styles.row}>
            <span className={styles.control} role="group" aria-label="Evidence">
              Evidence
              {ATLAS_AXES.map((id) => (
                <Link
                  key={id}
                  className={id === axis ? styles.chipActive : styles.chip}
                  aria-current={id === axis ? "true" : undefined}
                  title={EVIDENCE_TEXT[id].about}
                  to={atlasPath({ tab: "list", axis: id, genes: query.genes })}
                >
                  {EVIDENCE_TEXT[id].label}
                </Link>
              ))}
            </span>
          </div>
          <button type="button" className={styles.primary} disabled={!canShow || state.status === "loading"} onClick={show}>
            {state.status === "loading" ? "Reading the similarity…" : "Show the heatmap"}
          </button>
          {typed.length > MAX_LIST_GENES && (
            <div className={styles.muted} role="status">
              The heatmap takes at most {MAX_LIST_GENES} genes; this list has {typed.length.toLocaleString("en-US")}.
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.muted}>Example:</span>
            {EXAMPLES.map((example) => (
              <Link
                key={example.id}
                className={styles.chip}
                title={example.about}
                to={atlasPath({ tab: "list", axis, genes: example.genes })}
              >
                {example.name}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.listResult}>
          {state.status === "idle" && (
            <div className={styles.placeholder}>
              <h2>What you get</h2>
              <p className={styles.muted}>
                A heatmap of your genes against each other, ordered by clustering, with the genes of the list that the
                atlas does not have named below it. You can save the picture and the matrix, send the genes to another
                module, or see where they sit on the map.
                {query.genes.length === 1 ? ` One gene is not enough: enter at least ${MIN_LIST_GENES}.` : ""}
              </p>
            </div>
          )}
          {state.status === "loading" && (
            <div className={styles.status} role="status">
              Reading the similarity among {plural(query.genes.length, "gene")}…
            </div>
          )}
          {state.status === "error" && (
            <div className={styles.status} role="alert" data-testid="atlas-similarity-error">
              {state.message}
            </div>
          )}
          {data && heat && (
            <div className={styles.card} data-testid="atlas-similarity">
              <div className={styles.cardHead}>
                <div>
                  <h2>
                    {words.label} among {plural(heat.symbols.length, "gene")}
                  </h2>
                  <div className={styles.muted} data-testid="atlas-similarity-summary">
                    {words.about}. {heat.symbols.length} of {plural(query.genes.length, "gene")} shown
                    {missing.length > 0 ? `, ${missing.length} not in the atlas` : ""}.
                  </div>
                </div>
                <div className={styles.headActions}>
                  <Link
                    className={styles.action}
                    to={atlasPath({ tab: "map", axis: state.axis, genes: heat.symbols })}
                    title={`Highlight these genes on the ${state.axis === "pert" ? "knock-down" : "co-regulation"} map`}
                  >
                    Show on the map
                  </Link>
                  <SendToMenu genes={heat.symbols} label="Send the genes to…" defaultName="Atlas: gene list" exclude={["atlasList"]} drugs={false} />
                  <TableExportButtons rows={() => table.rows} columns={table.columns} filename={file} />
                </div>
              </div>
              <SimilarityHeatmap
                heat={heat}
                filename={file}
                pairText={state.axis === "pert" ? "Mean correlation of the knock-downs" : "Mean correlation of the two genes"}
              />
              <ColourKey axis={state.axis} limit={heat.limit} />
              <div className={`${styles.muted} ${styles.heatNote}`}>
                Point at a square, or tap it, for the mean correlation, the evidence score (the evidence of all
                datasets added up, in units of their noise) and the number of datasets that have both genes. The table
                files hold the mean correlations in the order of the picture.
              </div>
              {missing.length > 0 && (
                <div className={styles.warning} data-testid="atlas-similarity-missing">
                  {words.absent}: {missing.slice(0, MISSING_SHOWN).join(", ")}
                  {missing.length > MISSING_SHOWN ? ` and ${missing.length - MISSING_SHOWN} more` : ""}.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export { ListTab };
