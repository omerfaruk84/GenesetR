import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchIntegratedSignature } from "../../store/api/integrated";
import { copyText } from "../../utils/apiSnippets";
import { EXAMPLE_INTEGRATED_SIGNATURES } from "../../utils/examples";
import { integratedPath } from "../../utils/integrated";
import {
  MAX_GENES_IN_ADDRESS,
  MIN_SIGNATURE_GENES,
  fitsInAddress,
  parseSymbols,
  splitSavedList,
  tfRegulatorsPath,
} from "../../utils/regulators";
import { Controls, Explain, ListBox, OverexpressionCards, ResultCard, geneModeLink, plural, useSavedLists } from "./parts";
import styles from "./integrated-page.module.scss";

/**
 * Signature mode: perturbed genes whose knock-down lowers or raises a
 * signature (genes that go up, genes that go down), over all datasets.
 */
const SignatureMode = ({ query, summary, names, contextOf }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { minContexts, rows } = query;
  const controls = { minContexts, rows };

  const [upText, setUpText] = useState("");
  const [downText, setDownText] = useState("");
  const [submitted, setSubmitted] = useState(""); // JSON of the lists that were run
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const savedLists = useSavedLists();

  const up = useMemo(() => parseSymbols(upText), [upText]);
  const down = useMemo(() => parseSymbols(downText), [downText]);
  const total = up.length + down.length;
  const overlap = useMemo(() => up.filter((gene) => down.includes(gene)), [up, down]);
  const canRun = total >= MIN_SIGNATURE_GENES && state !== "running";

  // The address holds the lists: a shared link, or a link from another page
  const upKey = query.up.join(",");
  const downKey = query.down.join(",");
  useEffect(() => {
    if (!upKey && !downKey) return;
    const lists = { up: upKey ? upKey.split(",") : [], down: downKey ? downKey.split(",") : [] };
    setUpText(lists.up.join("\n"));
    setDownText(lists.down.join("\n"));
    if (query.run && lists.up.length + lists.down.length >= MIN_SIGNATURE_GENES) setSubmitted(JSON.stringify(lists));
  }, [upKey, downKey, query.run]);

  useEffect(() => {
    if (!submitted) return undefined;
    const lists = JSON.parse(submitted);
    const controller = new AbortController();
    setState("running");
    setError("");
    setResult(null);
    fetchIntegratedSignature({ ...lists, topN: rows, minContexts, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult(data);
        setState("done");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err?.message || "The analysis failed");
        setState("error");
      });
    return () => controller.abort();
  }, [submitted, attempt, rows, minContexts]);

  const go = (path) => {
    if (path !== `${location.pathname}${location.search}`) navigate(path);
  };

  const run = () => {
    setSubmitted(JSON.stringify({ up, down }));
    setAttempt((value) => value + 1);
    setCopied(false);
    // lists too long for a link: the address must not keep describing an earlier run
    go(integratedPath(fitsInAddress(up, down) ? { mode: "signature", up, down, run: true, ...controls } : { mode: "signature", ...controls }));
  };

  const loadSaved = (box) => (list) => {
    if (!list) return;
    const split = splitSavedList(list.genes);
    if (split.down.length > 0) {
      // a signature formula fills both boxes
      setUpText(split.up.join("\n"));
      setDownText(split.down.join("\n"));
    } else if (box === "down") {
      setDownText(split.up.join("\n"));
    } else {
      setUpText(split.up.join("\n"));
    }
  };

  const ranLists = submitted ? JSON.parse(submitted) : null;
  const shareable = ranLists ? fitsInAddress(ranLists.up, ranLists.down) : false;
  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}${window.location.pathname}${window.location.search}`);
    setCopied(ok);
  };

  const tables = {
    names,
    contextOf,
    nameHeader: "Perturbed gene",
    linkTo: geneModeLink("perturbation", controls),
    linkTitle: (name) => `What does perturbing ${name} do everywhere?`,
    sendLabel: "Send the perturbed genes to…",
    exclude: ["integratedSignature"],
    limit: 20,
    detailLimit: 10,
  };

  return (
    <>
      <Explain summary={summary}>
        Which knock-downs switch a signature off or on, in every dataset? Each perturbed gene is scored in each dataset
        by how far the signature moves (up genes up, down genes down) compared with random gene sets of the same size;
        these set scores are then combined like single-gene z-scores.
      </Explain>
      <div className={styles.layout}>
        <section className={styles.inputCard}>
          <h2>Your signature</h2>
          <p className={styles.muted}>
            Gene symbols separated by spaces, commas, semicolons or new lines. Either list may be empty; at least{" "}
            {MIN_SIGNATURE_GENES} genes in total.
          </p>
          <ListBox
            id="integrated-up"
            box="up"
            label="Genes that go up"
            hint={"HMGCS1\nHMGCR\nLDLR"}
            value={upText}
            count={up.length}
            onChange={setUpText}
            savedLists={savedLists}
            onLoad={loadSaved("up")}
          />
          <ListBox
            id="integrated-down"
            box="down"
            label="Genes that go down"
            hint="Optional"
            value={downText}
            count={down.length}
            onChange={setDownText}
            savedLists={savedLists}
            onLoad={loadSaved("down")}
          />
          {overlap.length > 0 && (
            <div className={styles.warning}>
              In both lists: {overlap.slice(0, 8).join(", ")}
              {overlap.length > 8 ? ` and ${overlap.length - 8} more` : ""}.
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.muted}>Example:</span>
            {EXAMPLE_INTEGRATED_SIGNATURES.map((example) => (
              <Link
                key={example.id}
                className={styles.chip}
                title={example.about}
                to={integratedPath({ mode: "signature", up: example.up, down: example.down, run: true, ...controls })}
              >
                {example.name}
              </Link>
            ))}
          </div>
          <button type="button" className={styles.run} disabled={!canRun} onClick={run}>
            {state === "running" ? "Scoring the perturbations…" : "Find perturbations"}
          </button>
          {total < MIN_SIGNATURE_GENES && <div className={styles.muted}>Enter at least {MIN_SIGNATURE_GENES} genes.</div>}
          {total >= MIN_SIGNATURE_GENES && !fitsInAddress(up, down) && (
            <div className={styles.muted}>
              Lists of more than {MAX_GENES_IN_ADDRESS} genes run as usual, but the result cannot be shared as a link.
            </div>
          )}
          <Controls
            minContexts={minContexts}
            rows={rows}
            onChange={(next) =>
              go(integratedPath({ mode: "signature", up: query.up, down: query.down, run: query.run, ...next }))
            }
          />
        </section>

        <section className={styles.results}>
          {state === "idle" && (
            <div className={styles.placeholder}>
              <h2>What you get</h2>
              <p className={styles.muted}>
                Two tables of perturbed genes: those needed for the signature (their knock-down lowers it) and those
                that hold it down (their knock-down raises it), each with the number of datasets and cell contexts
                that agree. Beside them, the TFs whose overexpression moves the signature. Genes whose loss stresses
                the cell change many signatures, so check a hit against the per-dataset values in its row.
              </p>
            </div>
          )}
          {state === "running" && (
            <div className={styles.status} role="status">
              Scoring every perturbed gene against your signature in each dataset. This takes a few seconds, a list of
              hundreds of genes up to a minute…
            </div>
          )}
          {state === "error" && (
            <div className={styles.status} role="alert">
              {error}
            </div>
          )}
          {state === "done" && result && (
            <>
              <div className={styles.resultHead}>
                <div className={styles.muted} data-testid="integrated-signature-summary">
                  {plural(result.genesUp ?? 0, "gene")} up and {plural(result.genesDown ?? 0, "gene")} down found;{" "}
                  {plural((result.datasetsUsed || []).length, "dataset")} used;{" "}
                  {(result.tested ?? 0).toLocaleString("en-US")} perturbed genes scored.
                </div>
                <div className={styles.headActions}>
                  {shareable && (
                    <button type="button" className={styles.action} onClick={copyLink} title="Copy the address of this result">
                      {copied ? "Link copied" : "Copy link"}
                    </button>
                  )}
                  {ranLists && (
                    <Link className={styles.action} to={tfRegulatorsPath({ up: ranLists.up, down: ranLists.down, run: true })}>
                      TFs only (TF regulators)
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.pair}>
                <ResultCard
                  {...tables}
                  testId="integrated-signature-required"
                  title="Needed for the signature"
                  hint="Knock-down lowers the signature"
                  rows={result.required}
                  empty="No knock-down lowers the signature reproducibly with these settings."
                />
                <ResultCard
                  {...tables}
                  testId="integrated-signature-restrains"
                  title="Hold the signature down"
                  hint="Knock-down raises the signature"
                  rows={result.restrains}
                  empty="No knock-down raises the signature reproducibly with these settings."
                />
              </div>
              <h2 className={styles.sectionTitle}>TFs whose overexpression moves the signature</h2>
              <OverexpressionCards
                overexpression={result.overexpression}
                names={names}
                subject="the genes are"
                groups={[
                  { key: "induces", title: "Overexpression induces the signature" },
                  { key: "suppresses", title: "Overexpression suppresses the signature" },
                ]}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
};

export { SignatureMode };
