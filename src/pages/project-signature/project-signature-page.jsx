import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { saveAs } from "file-saver";
import { SendToMenu } from "../../components/send-to";
import { runSignatureProjection } from "../../store/api";
import { parseDeText } from "../../utils/deTable";
import { EXAMPLE_SIGNATURES } from "../../utils/examples";
import { baseSymbol, genePagePath } from "../../utils/geneLinks";
import { describe as describeDrug, loadDrugLabels, useDrugLabelsVersion } from "../../utils/drugLabels";
import { drugPagePath, isDrugDataset } from "../../utils/perturbationKind";
import styles from "./project-signature-page.module.scss";

const METHODS = [
  { id: "cosine", label: "Cosine similarity", about: "Default. Uses the size of the changes." },
  { id: "pearson", label: "Pearson correlation", about: "Like cosine, after centring both profiles." },
  { id: "spearman", label: "Spearman correlation", about: "Rank based; robust to a few extreme values." },
];

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const fmt = (value, digits = 3) => (value === null || value === undefined ? "–" : Number(value).toFixed(digits));

const scoreColor = (value) => {
  const t = Math.max(-1, Math.min(1, value));
  const alpha = Math.abs(t) * 0.8;
  return t >= 0 ? `rgba(200, 55, 60, ${alpha})` : `rgba(45, 105, 190, ${alpha})`;
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// A match from a drug dataset shows the drug's name and opens the drug page
const GeneLink = ({ label, drug }) =>
  drug ? (
    <Link
      className={styles.geneLink}
      to={drugPagePath(label)}
      title={[drug.moaFine || drug.moaBroad, drug.targets.length > 0 ? `targets ${drug.targets.join(", ")}` : ""]
        .filter(Boolean)
        .join(" · ") || undefined}
    >
      {drug.display}
    </Link>
  ) : (
    <Link className={styles.geneLink} to={genePagePath(label)}>
      {label}
    </Link>
  );

/**
 * Ranked table of perturbations with their score.
 * `drugOf(label)` returns the drug a label stands for (matches from drug
 * datasets), or null for a gene.
 */
const ScoreTable = ({ title, hint, rows, scoreKey, showZ, showDatasets, drugOf = () => null, datasetId }) => {
  const drugs = rows.map((row) => drugOf(row.perturbation));
  const allDrugs = rows.length > 0 && drugs.every(Boolean);
  return (
  <div className={styles.tableCard}>
    <div className={styles.tableHead}>
      <div>
        <h3>{title}</h3>
        <div className={styles.muted}>{hint}</div>
      </div>
      <SendToMenu
        genes={rows.map((row, index) => (drugs[index] ? row.perturbation : baseSymbol(row.perturbation)))}
        label="Send to…"
        defaultName={title}
        drugs={allDrugs}
        datasetId={allDrugs ? datasetId : undefined}
      />
    </div>
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>{allDrugs ? "Drug" : "Perturbation"}</th>
            <th className={styles.num}>Score</th>
            {showZ && <th className={styles.num} title="How unusual the score is among all perturbations of the dataset (robust z)">z</th>}
            {showDatasets && <th className={styles.num}>Datasets</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.perturbation}>
              <td className={styles.rank}>{index + 1}</td>
              <td>
                <GeneLink label={row.perturbation} drug={drugs[index]} />
              </td>
              <td className={styles.num}>
                <span className={styles.value} style={{ background: scoreColor(row[scoreKey]) }}>
                  {fmt(row[scoreKey])}
                </span>
              </td>
              {showZ && <td className={styles.num}>{fmt(row.z, 1)}</td>}
              {showDatasets && <td className={styles.num}>{row.datasets}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

const ProjectSignaturePage = () => {
  const datasetList = useSelector((state) => state.settings?.core?.datasetList) || [];
  const datasets = useMemo(
    () => datasetList.filter((d) => d.isDrResult !== true && d.isUserUploaded !== true && d.derived !== true),
    [datasetList]
  );

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [maxPadj, setMaxPadj] = useState("");
  const [selected, setSelected] = useState(null); // dataset ids; null = default not chosen yet
  const [method, setMethod] = useState("cosine");
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("combined");
  // The drug collection has one table per cell line: listed only on request
  const [showLineTables, setShowLineTables] = useState(false);
  const fileInput = useRef(null);

  // Default selection: the genome-wide datasets
  useEffect(() => {
    if (selected === null && datasets.length > 0) {
      const genomeWide = datasets.filter((d) => d.isWholeGenome).map((d) => d.id);
      setSelected(genomeWide.length > 0 ? genomeWide : [datasets[0].id]);
    }
  }, [datasets, selected]);

  // Parse as the user types, so problems show before running
  const parsed = useMemo(() => {
    if (!text.trim()) return { empty: true };
    try {
      const threshold = maxPadj === "" ? null : Number(maxPadj);
      return parseDeText(text, { maxPadj: Number.isFinite(threshold) ? threshold : null });
    } catch (err) {
      return { error: err.message };
    }
  }, [text, maxPadj]);

  const up = parsed.signature ? parsed.signature.filter((row) => row[1] > 0).length : 0;
  const down = parsed.signature ? parsed.signature.length - up : 0;
  const chosen = selected || [];
  const canRun = !!parsed.signature && parsed.signature.length >= 10 && chosen.length > 0 && state !== "running";

  const names = useMemo(() => Object.fromEntries(datasets.map((d) => [d.id, d.name || d.id])), [datasets]);

  const isLineTable = (d) => isDrugDataset(d) && d.drugTable === "line";
  const lineTableCount = datasets.filter(isLineTable).length;
  const offeredDatasets = datasets.filter((d) => showLineTables || !isLineTable(d) || chosen.includes(d.id));

  // Matches from drug datasets are drug ids: their names come from the label tables
  const drugDatasetIds = useMemo(() => new Set(datasets.filter(isDrugDataset).map((d) => d.id)), [datasets]);
  const resultDrugIds = useMemo(
    () => (result?.datasets || []).map((d) => d.dataset).filter((id) => drugDatasetIds.has(id)),
    [result, drugDatasetIds]
  );
  useEffect(() => {
    resultDrugIds.forEach((id) => loadDrugLabels(id));
  }, [resultDrugIds]);
  useDrugLabelsVersion();
  const drugIn = (ids) => (label) => {
    for (const id of ids) {
      const drug = describeDrug(label, id);
      if (drug) return drug;
    }
    return null;
  };

  const loadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("The file is larger than 20 MB. A differential-expression table should be much smaller.");
      setState("error");
      return;
    }
    setText(await file.text());
    setFileName(file.name);
  };

  const loadExample = (example) => {
    setText(example.formula);
    setFileName("");
    setMaxPadj("");
  };

  const toggleDataset = (id) =>
    setSelected((current) => ((current || []).includes(id) ? current.filter((d) => d !== id) : [...(current || []), id]));

  const run = async () => {
    setState("running");
    setError("");
    setResult(null);
    try {
      const data = await runSignatureProjection({ signature: parsed.signature, datasets: chosen, method, topN: 50 });
      setResult(data);
      const firstOk = data.datasets.find((d) => !d.error);
      setTab(data.combined ? "combined" : firstOk?.dataset);
      setState("done");
    } catch (err) {
      setError(err?.message || "The analysis failed");
      setState("error");
    }
  };

  const download = () => {
    const lines = ["dataset,direction,rank,perturbation,score,z,datasets"];
    if (result.combined) {
      ["mimic", "reverse"].forEach((direction) =>
        result.combined[direction].forEach((row, i) =>
          lines.push(["combined", direction, i + 1, csvCell(row.perturbation), row.mean_score, "", row.datasets].join(","))
        )
      );
    }
    result.datasets.filter((d) => !d.error).forEach((d) =>
      ["mimic", "reverse"].forEach((direction) =>
        d[direction].forEach((row, i) =>
          lines.push([csvCell(d.dataset), direction, i + 1, csvCell(row.perturbation), row.score, row.z, ""].join(","))
        )
      )
    );
    saveAs(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), "genesetr-signature-projection.csv");
  };

  const current = result && tab !== "combined" ? result.datasets.find((d) => d.dataset === tab) : null;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Project my signature</h1>
        <p className={styles.lead}>
          Bring a differential-expression result from your own experiment and find the perturbations whose effect on
          the transcriptome looks the same (they <em>mimic</em> your condition) or the opposite (they <em>reverse</em>{" "}
          it). A strong mimic suggests that your condition acts through that gene or its pathway.
        </p>

        <div className={styles.layout}>
          <section className={styles.inputCard}>
            <h2>1. Your signature</h2>
            <p className={styles.muted}>
              Paste or upload a DESeq2, edgeR, limma or Seurat table (gene plus log fold change or test statistic), two
              columns “gene value”, or an up/down list such as <code>ATF4+DDIT3-TUBB</code>.
            </p>
            <textarea
              className={styles.textarea}
              value={text}
              spellCheck={false}
              placeholder={"gene\tlog2FoldChange\tpadj\nATF4\t2.31\t1e-12\nDDIT3\t1.87\t3e-9\nTUBB\t-0.92\t0.004"}
              aria-label="Differential-expression table"
              onChange={(event) => {
                setText(event.target.value);
                setFileName("");
              }}
            />
            <div className={styles.row}>
              <button type="button" className={styles.action} onClick={() => fileInput.current?.click()}>
                Choose a file…
              </button>
              <input ref={fileInput} type="file" accept=".csv,.tsv,.txt" hidden onChange={loadFile} />
              {fileName && <span className={styles.muted}>{fileName}</span>}
              <span className={styles.spacer} />
              <span className={styles.muted}>Example:</span>
              {EXAMPLE_SIGNATURES.map((example) => (
                <button key={example.id} type="button" className={styles.chip} title={example.about} onClick={() => loadExample(example)}>
                  {example.name}
                </button>
              ))}
            </div>

            <div className={styles.parseStatus} role="status">
              {parsed.empty && <span className={styles.muted}>Nothing entered yet.</span>}
              {parsed.error && <span className={styles.errorText}>{parsed.error}</span>}
              {parsed.signature && (
                <>
                  <strong>{parsed.signature.length}</strong> genes read ({up} up, {down} down)
                  {parsed.valueColumn && (
                    <>
                      {" "}
                      using column <code>{parsed.valueColumn}</code>
                    </>
                  )}
                  {parsed.skipped > 0 && <>; {parsed.skipped} rows skipped</>}.
                  {parsed.signature.length < 10 && <span className={styles.errorText}> At least 10 genes are needed.</span>}
                </>
              )}
            </div>
            {parsed.padjColumn !== undefined && parsed.padjColumn !== null && (
              <label className={styles.inline}>
                Keep only genes with <code>{parsed.padjColumn}</code> ≤
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="all"
                  className={styles.small}
                  value={maxPadj}
                  onChange={(event) => setMaxPadj(event.target.value)}
                />
              </label>
            )}

            <h2>2. Datasets to compare with</h2>
            <div className={styles.datasetChips}>
              {offeredDatasets.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={chosen.includes(d.id)}
                  className={`${styles.chip} ${chosen.includes(d.id) ? styles.chipActive : ""}`}
                  title={d.description || d.name}
                  onClick={() => toggleDataset(d.id)}
                >
                  {d.name || d.id}
                </button>
              ))}
              {datasets.length === 0 && <span className={styles.muted}>Loading datasets…</span>}
              {lineTableCount > 0 && (
                <button type="button" className={styles.chip} aria-expanded={showLineTables} onClick={() => setShowLineTables((v) => !v)}>
                  {showLineTables ? "Hide" : "Show"} the {lineTableCount} cell-line tables of the drug screen
                </button>
              )}
            </div>

            <h2>3. Similarity measure</h2>
            <div className={styles.methods}>
              {METHODS.map((m) => (
                <label key={m.id} className={styles.method}>
                  <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <span>
                    <strong>{m.label}</strong>
                    <span className={styles.muted}> {m.about}</span>
                  </span>
                </label>
              ))}
            </div>

            <button type="button" className={styles.run} disabled={!canRun} onClick={run}>
              {state === "running" ? "Comparing…" : "Find matching perturbations"}
            </button>
            {!canRun && state !== "running" && (
              <div className={styles.muted}>
                {!parsed.signature ? "Enter a signature first." : chosen.length === 0 ? "Select at least one dataset." : ""}
              </div>
            )}
          </section>

          <section className={styles.results}>
            {state === "idle" && (
              <div className={styles.placeholder}>
                <h2>How it works</h2>
                <ol>
                  <li>Your signature is matched to the genes each dataset measures.</li>
                  <li>
                    Every perturbation gets a score between −1 and 1: the similarity between your signature and the
                    expression changes that perturbation causes.
                  </li>
                  <li>
                    With two or more datasets, a combined ranking averages the score of each gene over the datasets that
                    perturb it; hits that repeat across cell types are the most trustworthy.
                  </li>
                </ol>
                <p className={styles.muted}>
                  Scores describe similarity, not statistical significance. The z column says how far a score lies from
                  the bulk of perturbations in the same dataset.
                </p>
              </div>
            )}
            {state === "running" && <div className={styles.status} role="status">Comparing your signature with every perturbation…</div>}
            {state === "error" && <div className={styles.status} role="alert">{error}</div>}

            {state === "done" && result && (
              <>
                <div className={styles.resultHead}>
                  <div className={styles.muted}>
                    {result.signature_genes} signature genes ({result.signature_up} up, {result.signature_down} down) ·{" "}
                    {METHODS.find((m) => m.id === result.method)?.label} · z-scores clipped at ±{result.z_clip}
                  </div>
                  <button type="button" className={styles.action} onClick={download}>
                    Download CSV
                  </button>
                </div>
                <div className={styles.tabs} role="tablist">
                  {result.combined && (
                    <button type="button" role="tab" aria-selected={tab === "combined"} className={`${styles.chip} ${tab === "combined" ? styles.chipActive : ""}`} onClick={() => setTab("combined")}>
                      Combined
                    </button>
                  )}
                  {result.datasets.map((d) => (
                    <button
                      key={d.dataset}
                      type="button"
                      role="tab"
                      aria-selected={tab === d.dataset}
                      disabled={!!d.error}
                      title={d.error || `${d.genes_used} signature genes used`}
                      className={`${styles.chip} ${tab === d.dataset ? styles.chipActive : ""}`}
                      onClick={() => setTab(d.dataset)}
                    >
                      {names[d.dataset] || d.dataset}
                      {d.error ? " (skipped)" : ""}
                    </button>
                  ))}
                </div>
                {result.datasets.filter((d) => d.error).map((d) => (
                  <div key={d.dataset} className={styles.warning}>
                    {names[d.dataset] || d.dataset}: {d.error}
                  </div>
                ))}

                {tab === "combined" && result.combined && (
                  <div className={styles.pair}>
                    <ScoreTable title="Mimic your signature" hint="Mean score over the datasets that perturb the gene" rows={result.combined.mimic} scoreKey="mean_score" showDatasets drugOf={drugIn(resultDrugIds)} />
                    <ScoreTable title="Reverse your signature" hint="Mean score over the datasets that perturb the gene" rows={result.combined.reverse} scoreKey="mean_score" showDatasets drugOf={drugIn(resultDrugIds)} />
                  </div>
                )}
                {current && !current.error && (
                  <>
                    <div className={styles.muted}>
                      {current.genes_used} of your genes are measured here; compared with {current.perturbations}{" "}
                      {drugDatasetIds.has(current.dataset) ? "drug treatments" : "perturbations"}.
                    </div>
                    <div className={styles.pair}>
                      <ScoreTable title="Mimic your signature" hint={names[current.dataset] || current.dataset} rows={current.mimic} scoreKey="score" showZ drugOf={drugIn(drugDatasetIds.has(current.dataset) ? [current.dataset] : [])} datasetId={current.dataset} />
                      <ScoreTable title="Reverse your signature" hint={names[current.dataset] || current.dataset} rows={current.reverse} scoreKey="score" showZ drugOf={drugIn(drugDatasetIds.has(current.dataset) ? [current.dataset] : [])} datasetId={current.dataset} />
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export { ProjectSignaturePage };
