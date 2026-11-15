import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchIntegratedPerturbationSet } from "../../store/api/integrated";
import { copyText } from "../../utils/apiSnippets";
import { EXAMPLE_PERTURBATION_SETS } from "../../utils/examples";
import { MIN_SET_GENES, integratedPath } from "../../utils/integrated";
import { MAX_GENES_IN_ADDRESS, fitsInAddress, parseSymbols, splitSavedList } from "../../utils/regulators";
import { Controls, ListBox, ResultCard, geneModeLink, plural, useSavedLists } from "./parts";
import styles from "./integrated-page.module.scss";

/**
 * Common effects of a gene list: the genes that all the listed perturbations
 * change in the same direction.
 */
const SetMode = ({ query }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { minContexts, rows } = query;
  const controls = { minContexts, rows };

  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(""); // JSON of the list that was run
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const savedLists = useSavedLists();

  const genes = useMemo(() => parseSymbols(text), [text]);
  const canRun = genes.length >= MIN_SET_GENES && state !== "running";

  // The address holds the list: a shared link, or a link from another page
  const genesKey = query.genes.join(",");
  useEffect(() => {
    if (!genesKey) return;
    const list = genesKey.split(",");
    setText(list.join("\n"));
    if (query.run && list.length >= MIN_SET_GENES) setSubmitted(JSON.stringify(list));
  }, [genesKey, query.run]);

  useEffect(() => {
    if (!submitted) return undefined;
    const controller = new AbortController();
    setState("running");
    setError("");
    setResult(null);
    fetchIntegratedPerturbationSet({ perturbations: JSON.parse(submitted), topN: rows, signal: controller.signal })
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
  }, [submitted, attempt, rows]);

  const go = (path) => {
    if (path !== `${location.pathname}${location.search}`) navigate(path);
  };

  const run = () => {
    setSubmitted(JSON.stringify(genes));
    setAttempt((value) => value + 1);
    setCopied(false);
    // a list too long for a link: the address must not keep describing an earlier run
    go(integratedPath(fitsInAddress(genes, []) ? { mode: "set", genes, run: true, ...controls } : { mode: "set", ...controls }));
  };

  const loadSaved = (list) => {
    if (!list) return;
    const split = splitSavedList(list.genes);
    setText([...split.up, ...split.down].join("\n"));
  };

  const shareable = submitted ? fitsInAddress(JSON.parse(submitted), []) : false;
  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}${window.location.pathname}${window.location.search}`);
    setCopied(ok);
  };

  const tables = {
    nameHeader: "Measured gene",
    linkTo: geneModeLink("measured", controls),
    linkTitle: (name) => `What controls ${name} everywhere?`,
    exclude: ["integratedSet"],
    limit: 20,
    detailLimit: 10,
  };

  return (
    <>
      <p className={styles.explain} data-testid="integrated-explain">
        What do these perturbations have in common? For each listed gene the consensus effect of its knock-down over
        all loss-of-function datasets (CRISPRi and knock-out) is taken, and the genes that the listed perturbations
        change in the same direction are ranked. <strong>Combined z</strong> summarises the effect over the listed
        perturbations, <strong>Measured</strong> is how many of them have a value for the gene, and{" "}
        <strong>Agreeing</strong> how many change it in that direction. One strong perturbation can carry a row, so
        open it for the value of each perturbation. A gene that is absent may simply not be measured in the datasets
        that perturb your genes.
      </p>
      <div className={styles.layout}>
        <section className={styles.inputCard}>
          <h2>Perturbed genes</h2>
          <p className={styles.muted}>
            Gene symbols separated by spaces, commas, semicolons or new lines; at least {MIN_SET_GENES} that are
            perturbed in a dataset.
          </p>
          <ListBox
            id="integrated-set"
            box="perturbation"
            label="Perturbed genes"
            hint={"PSMA1\nPSMB3\nPSMD4"}
            value={text}
            count={genes.length}
            onChange={setText}
            savedLists={savedLists}
            onLoad={loadSaved}
          />
          <div className={styles.row}>
            <span className={styles.muted}>Example:</span>
            {EXAMPLE_PERTURBATION_SETS.map((example) => (
              <Link
                key={example.id}
                className={styles.chip}
                title={example.about}
                to={integratedPath({ mode: "set", genes: example.genes, run: true, ...controls })}
              >
                {example.name}
              </Link>
            ))}
          </div>
          <button type="button" className={styles.run} disabled={!canRun} onClick={run}>
            {state === "running" ? "Combining the perturbations…" : "Find common effects"}
          </button>
          {genes.length < MIN_SET_GENES && <div className={styles.muted}>Enter at least {MIN_SET_GENES} genes.</div>}
          {genes.length > MAX_GENES_IN_ADDRESS && (
            <div className={styles.muted}>
              Lists of more than {MAX_GENES_IN_ADDRESS} genes run as usual, but the result cannot be shared as a link.
            </div>
          )}
          <Controls
            withContexts={false}
            minContexts={minContexts}
            rows={rows}
            onChange={(next) => go(integratedPath({ mode: "set", genes: query.genes, run: query.run, ...next }))}
          />
        </section>

        <section className={styles.results}>
          {state === "idle" && (
            <div className={styles.placeholder}>
              <h2>What you get</h2>
              <p className={styles.muted}>
                Two tables of measured genes: those that go up and those that go down under the listed perturbations,
                for example the members of a complex, a cluster from the correlation map or a saved list. Genes of the
                list that are not perturbed in any dataset are named.
              </p>
            </div>
          )}
          {state === "running" && (
            <div className={styles.status} role="status">
              Combining the effects of the listed perturbations…
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
                <div className={styles.muted} data-testid="integrated-set-summary">
                  {plural((result.perturbations || []).length, "perturbed gene")} used
                  {(result.perturbations || []).length <= 12 ? ` (${(result.perturbations || []).join(", ")})` : ""};{" "}
                  {(result.genesTested ?? 0).toLocaleString("en-US")} measured genes tested.
                  {(result.missing || []).length > 0 && (
                    <span data-testid="integrated-set-missing">
                      {" "}
                      Not perturbed in any integrated dataset: {result.missing.join(", ")}.
                    </span>
                  )}
                </div>
                {shareable && (
                  <button type="button" className={styles.action} onClick={copyLink} title="Copy the address of this result">
                    {copied ? "Link copied" : "Copy link"}
                  </button>
                )}
              </div>
              <div className={styles.pair}>
                <ResultCard
                  {...tables}
                  testId="integrated-set-up"
                  title="Go up under the listed perturbations"
                  rows={result.up}
                  empty="No gene goes up consistently."
                />
                <ResultCard
                  {...tables}
                  testId="integrated-set-down"
                  title="Go down under the listed perturbations"
                  rows={result.down}
                  empty="No gene goes down consistently."
                />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
};

export { SetMode };
