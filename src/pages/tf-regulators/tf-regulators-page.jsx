import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { RegulatorTable } from "../../components/regulator-table";
import { SendToMenu } from "../../components/send-to";
import { fetchRegulatorSources, fetchRegulatorsOfGeneSet } from "../../store/api/regulators";
import { copyText } from "../../utils/apiSnippets";
import { EXAMPLE_REGULATOR_SETS } from "../../utils/examples";
import { integratedPath } from "../../utils/integrated";
import {
  MAX_GENES_IN_ADDRESS,
  MIN_SIGNATURE_GENES,
  REGULATOR_EXPORT_COLUMNS,
  fitsInAddress,
  measuredSummary,
  parseSymbols,
  readRegulatorQuery,
  regulatorExportRows,
  splitSavedList,
  tfRegulatorsPath,
} from "../../utils/regulators";
import { listGeneLists, useWorkspaceVersion } from "../../utils/workspace";
import styles from "./tf-regulators-page.module.scss";

const GROUPS = [
  { key: "supportedByBoth", title: "Supported by both directions" },
  { key: "activators", title: "Activate the signature" },
  { key: "repressors", title: "Repress the signature" },
];

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** One list box with the menu of saved lists. */
const ListBox = ({ id, label, hint, value, count, onChange, savedLists, onLoad }) => (
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
      aria-label={`Load a saved gene list (${id.endsWith("-up") ? "up" : "down"} list)`}
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

const TfRegulatorsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const datasetList = useSelector((state) => state.settings?.core?.datasetList);

  const [upText, setUpText] = useState("");
  const [downText, setDownText] = useState("");
  const [submitted, setSubmitted] = useState(""); // JSON of the lists that were run
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState(null);
  const [savedLists, setSavedLists] = useState([]);
  const [copied, setCopied] = useState(false);
  const workspaceVersion = useWorkspaceVersion();

  const up = useMemo(() => parseSymbols(upText), [upText]);
  const down = useMemo(() => parseSymbols(downText), [downText]);
  const total = up.length + down.length;
  const overlap = useMemo(() => up.filter((gene) => down.includes(gene)), [up, down]);
  const canRun = total >= MIN_SIGNATURE_GENES && state !== "running";

  useEffect(() => {
    document.title = "TF regulators – GeneSetR";
    let current = true;
    fetchRegulatorSources().then((data) => {
      if (current) setSources(data);
    });
    return () => {
      current = false;
      document.title = "GeneSetR";
    };
  }, []);

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

  // The address holds the lists: a shared link, or a link from another page
  useEffect(() => {
    const query = readRegulatorQuery(location.search);
    if (query.up.length === 0 && query.down.length === 0) return;
    setUpText(query.up.join("\n"));
    setDownText(query.down.join("\n"));
    if (query.run && query.up.length + query.down.length >= MIN_SIGNATURE_GENES) {
      setSubmitted(JSON.stringify({ up: query.up, down: query.down }));
    }
  }, [location.search]);

  useEffect(() => {
    if (!submitted) return undefined;
    const lists = JSON.parse(submitted);
    const controller = new AbortController();
    setState("running");
    setError("");
    setResult(null);
    fetchRegulatorsOfGeneSet({ ...lists, topN: 25, signal: controller.signal })
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
  }, [submitted, attempt]);

  const run = () => {
    setSubmitted(JSON.stringify({ up, down }));
    setAttempt((value) => value + 1);
    setCopied(false);
    if (fitsInAddress(up, down)) {
      const path = tfRegulatorsPath({ up, down, run: true });
      if (path !== `${location.pathname}${location.search}`) navigate(path);
    } else if (location.search) {
      // too long for a link: the address must not keep describing an earlier run
      navigate(tfRegulatorsPath());
    }
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

  const names = useMemo(() => {
    const map = {};
    (datasetList || []).forEach((dataset) => {
      map[dataset.id] = dataset.name || dataset.id;
    });
    [...(sources?.gain || []), ...(sources?.loss || [])].forEach((entry) => {
      map[entry.dataset] = entry.name || entry.dataset;
    });
    return map;
  }, [datasetList, sources]);

  const gainDatasets = useMemo(() => {
    const ids = new Set((sources?.gain || []).map((entry) => entry.dataset));
    Object.entries(result?.datasets || {}).forEach(([id, entry]) => {
      if (entry?.direction === "gain") ids.add(id);
    });
    return [...ids];
  }, [sources, result]);

  const tableOptions = { names, gainDatasets };
  const measured = result ? measuredSummary(result.datasets) : null;
  const limit = 2 * (result?.strongZ || 3);
  const ranLists = submitted ? JSON.parse(submitted) : null;
  const shareable = ranLists ? fitsInAddress(ranLists.up, ranLists.down) : false;
  const tfCount = sources?.transcriptionFactors || result?.tested || 1462;

  const exportRows = () =>
    GROUPS.flatMap((group) => regulatorExportRows(result?.[group.key], group.title, tableOptions));

  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}${window.location.pathname}${window.location.search}`);
    setCopied(ok);
  };

  const renderGroup = (group, hint, empty) => {
    const rows = result?.[group.key] || [];
    return (
      <div className={styles.tableCard} data-testid={`regulators-${group.key}`}>
        <div className={styles.tableHead}>
          <div>
            <h3>{group.title}</h3>
            <div className={styles.muted}>{hint}</div>
          </div>
          {rows.length > 0 && (
            <SendToMenu
              genes={rows.map((row) => row.tf)}
              label="Send the TFs to…"
              defaultName={`TF regulators: ${group.title.toLowerCase()}`}
              exclude={["tfRegulators"]}
              drugs={false}
            />
          )}
        </div>
        <RegulatorTable rows={rows} names={names} gainDatasets={gainDatasets} limit={limit} empty={empty} />
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>TF regulators</h1>
        <p className={styles.lead}>
          Which transcription factors switch a set of genes on or off? Each of {tfCount.toLocaleString("en-US")} TFs is
          scored twice: by what happens to your genes when the TF is overexpressed (TF Atlas, human stem cells) and by
          what happens when it is knocked down or knocked out
          {sources?.loss?.length ? ` (${sources.loss.length} datasets)` : ""}. A TF that raises your signature when
          overexpressed and lowers it when knocked down is a supported activator; the reverse is a supported repressor.
        </p>

        <div className={styles.layout}>
          <section className={styles.inputCard}>
            <h2>Your signature</h2>
            <p className={styles.muted}>
              Gene symbols separated by spaces, commas, semicolons or new lines. Either list may be empty; at least{" "}
              {MIN_SIGNATURE_GENES} genes in total.
            </p>
            <ListBox
              id="tf-regulators-up"
              label="Genes that go up"
              hint={"NCL\nNPM1\nLDHA"}
              value={upText}
              count={up.length}
              onChange={setUpText}
              savedLists={savedLists}
              onLoad={loadSaved("up")}
            />
            <ListBox
              id="tf-regulators-down"
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
              {EXAMPLE_REGULATOR_SETS.map((example) => (
                <Link
                  key={example.id}
                  className={styles.chip}
                  title={example.about}
                  to={tfRegulatorsPath({ up: example.up, down: example.down, run: true })}
                >
                  {example.name}
                </Link>
              ))}
            </div>

            <button type="button" className={styles.run} disabled={!canRun} onClick={run}>
              {state === "running" ? "Scoring the TFs…" : "Find TF regulators"}
            </button>
            {total < MIN_SIGNATURE_GENES && (
              <div className={styles.muted}>Enter at least {MIN_SIGNATURE_GENES} genes.</div>
            )}
            <div className={styles.row}>
              <Link
                className={styles.action}
                title="The same lists scored against every perturbed gene of the knock-down datasets (Integrated analysis)"
                to={integratedPath({ mode: "signature", up, down, run: true })}
              >
                Search all perturbations, not only TFs
              </Link>
            </div>
            {total >= MIN_SIGNATURE_GENES && !fitsInAddress(up, down) && (
              <div className={styles.muted}>
                Lists of more than {MAX_GENES_IN_ADDRESS} genes run as usual, but the result cannot be shared as a link.
              </div>
            )}
          </section>

          <section className={styles.results}>
            {state === "idle" && (
              <div className={styles.placeholder}>
                <h2>How to read the result</h2>
                <ol>
                  <li>
                    <strong>Overexpression score</strong>: how strongly your signature moves (up genes up, down genes
                    down) when the TF is overexpressed, compared with random gene sets of the same size.
                  </li>
                  <li>
                    <strong>Knock-down score</strong>: the same when the TF is knocked down or knocked out, combined
                    over the datasets that perturb it. For an activator it is negative.
                  </li>
                  <li>
                    <strong>Combined</strong> ranks the evidence for activation from both; negative values mean
                    repression.
                  </li>
                </ol>
                <p className={styles.muted}>
                  The “TFs” are the {tfCount.toLocaleString("en-US")} genes of the TF Atlas library, which includes
                  some regulators that are not transcription factors. Hits seen only after knock-down are dominated by
                  essential genes whose loss stresses the cell, so the list supported by both directions is the most
                  specific.
                </p>
              </div>
            )}
            {state === "running" && (
              <div className={styles.status} role="status">
                Scoring {tfCount.toLocaleString("en-US")} TFs against your signature. A short list takes a few seconds,
                a list of hundreds of genes up to a minute…
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
                  <div className={styles.muted} data-testid="regulators-summary">
                    {plural(result.genesUp ?? 0, "gene")} up and {plural(result.genesDown ?? 0, "gene")} down, measured
                    in {plural(measured.datasets, "dataset")}.{" "}
                    {measured.gainDatasets > 0
                      ? `Overexpression (${plural(measured.gainDatasets, "dataset")}): ${measured.gainUp} up, ${measured.gainDown} down measured. `
                      : "None of the genes is measured in the TF Atlas, so only knock-down evidence is available. "}
                    {measured.lossDatasets > 0
                      ? `Knock-down (${plural(measured.lossDatasets, "dataset")}): up to ${measured.lossUp} up, ${measured.lossDown} down measured. `
                      : ""}
                    {result.tested} TFs scored.
                  </div>
                  <div className={styles.headActions}>
                    {shareable && (
                      <button type="button" className={styles.action} onClick={copyLink} title="Copy the address of this result">
                        {copied ? "Link copied" : "Copy link"}
                      </button>
                    )}
                    <TableExportButtons rows={exportRows} columns={REGULATOR_EXPORT_COLUMNS} filename="genesetr-tf-regulators" />
                  </div>
                </div>
                <p className={styles.explain}>
                  Scores are z-scores of the signature against random gene sets of the same size; |z| ≥{" "}
                  {result.strongZ} counts as an effect. The “TFs” are the genes of the TF Atlas library, which includes
                  some regulators that are not transcription factors. Hits seen only after knock-down are dominated by
                  essential genes whose loss stresses the cell, so the first table is the most specific. Open a row
                  for the score in each dataset.
                </p>

                {renderGroup(
                  GROUPS[0],
                  "Overexpression and knock-down agree: the most specific list",
                  "No TF is supported by both overexpression and knock-down for this signature."
                )}
                <div className={styles.pair}>
                  {renderGroup(GROUPS[1], "Highest combined evidence for activation", "None")}
                  {renderGroup(GROUPS[2], "Highest combined evidence for repression", "None")}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export { TfRegulatorsPage };
