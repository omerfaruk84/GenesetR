import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaExternalLinkAlt } from "react-icons/fa";
import { GeneSearch } from "../../components/gene-search";
import { fetchGeneInfo, fetchGeneSummary, resolveGeneAlias } from "../../store/api/genes";
import { baseSymbol, geneLinks, genePagePath } from "../../utils/geneLinks";
import { sendGenesTo } from "../../utils/sendTo";
import { SendToMenu } from "../../components/send-to";
import styles from "./gene-page.module.scss";

const EXAMPLES = ["ATF4", "MED12", "HSPA5", "TP53", "MYC", "EIF2AK4"];

const fmt = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(value) ? "–" : Number(value).toFixed(digits);

// Diverging blue-white-red for values in [-limit, limit]
const divergingColor = (value, limit) => {
  if (value === null || value === undefined) return "transparent";
  const t = Math.max(-1, Math.min(1, value / limit));
  const alpha = Math.abs(t) * 0.85;
  return t >= 0 ? `rgba(200, 55, 60, ${alpha})` : `rgba(45, 105, 190, ${alpha})`;
};

const GeneLink = ({ label }) => (
  <Link className={styles.geneLink} to={genePagePath(label)} title={`Open the gene page of ${baseSymbol(label)}`}>
    {label}
  </Link>
);

/** Ranked list of { [labelKey], [valueKey] } rows with a small value bar. */
const RankedList = ({ title, rows, labelKey, valueKey, limit, empty = "None" }) => (
  <div className={styles.ranked}>
    <div className={styles.rankedTitle}>{title}</div>
    {!rows || rows.length === 0 ? (
      <div className={styles.muted}>{empty}</div>
    ) : (
      <ol className={styles.rankedList}>
        {rows.map((row) => (
          <li key={row[labelKey]} className={styles.rankedRow}>
            <GeneLink label={row[labelKey]} />
            <span className={styles.value} style={{ background: divergingColor(row[valueKey], limit) }}>
              {fmt(row[valueKey])}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

const Conservation = ({ conservation, names }) => {
  if (!conservation) return null;
  const { datasets, pearson, shared_genes: shared } = conservation;
  return (
    <section className={styles.section}>
      <h2>Is the knock-down effect conserved between datasets?</h2>
      <p className={styles.help}>
        Pearson correlation between the knock-down profiles of this gene in each pair of datasets, over the genes
        both measure (z-scores clipped at ±{conservation.z_clip}). Empty cells share fewer than{" "}
        {conservation.min_shared_genes} genes. Values near 1 mean the same genes respond in both contexts.
      </p>
      <div className={styles.tableScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th />
              {datasets.map((id) => (
                <th key={id} title={names[id] || id}>
                  <span>{names[id] || id}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasets.map((rowId, i) => (
              <tr key={rowId}>
                <th scope="row">{names[rowId] || rowId}</th>
                {datasets.map((colId, j) => (
                  <td
                    key={colId}
                    style={{ background: divergingColor(pearson[i][j], 1) }}
                    title={`${names[rowId] || rowId} vs ${names[colId] || colId}: r = ${fmt(pearson[i][j])} (${shared[i][j]} shared genes)`}
                  >
                    {i === j ? "" : fmt(pearson[i][j])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const GenePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const symbol = (params.get("symbol") || "").trim().toUpperCase();

  const [summary, setSummary] = useState(null);
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | notFound | error
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showFullText, setShowFullText] = useState(false);
  const [aliases, setAliases] = useState([]); // official symbols when `symbol` is an alias

  useEffect(() => {
    setSummary(null);
    setInfo(null);
    setSelected(null);
    setShowFullText(false);
    setAliases([]);
    if (!symbol) {
      setState("idle");
      return undefined;
    }
    document.title = `${symbol} – GeneSetR`;
    const controller = new AbortController();
    setState("loading");
    fetchGeneSummary(symbol, { signal: controller.signal })
      .then((data) => {
        setSummary(data);
        setSelected(data.datasets[0]?.dataset || null);
        setState("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        setState(err.notFound ? "notFound" : "error");
        if (err.notFound) {
          resolveGeneAlias(symbol, { signal: controller.signal }).then((hits) => {
            if (!controller.signal.aborted) setAliases(hits);
          });
        }
      });
    fetchGeneInfo(symbol, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setInfo(data);
    });
    return () => {
      controller.abort();
      document.title = "GeneSetR";
    };
  }, [symbol]);

  const names = useMemo(() => {
    const map = {};
    (summary?.datasets || []).forEach((d) => {
      map[d.dataset] = d.name || d.dataset;
    });
    return map;
  }, [summary]);

  const current = summary?.datasets.find((d) => d.dataset === selected) || null;
  const open = (target, genes, datasetId) => {
    const path = dispatch(sendGenesTo(target, genes, { datasetId }));
    if (path) navigate(path);
  };

  // Gene plus its closest perturbations in the selected dataset, for "Open in"
  const neighbourhood = useMemo(() => {
    if (!current?.neighbours) return [];
    return [symbol, ...current.neighbours.most_similar.map((row) => row.perturbation)];
  }, [current, symbol]);

  const summaryText = info?.summary || "";
  const longText = summaryText.length > 420;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.searchRow}>
          <GeneSearch size="lg" autoFocus={!symbol} initialValue={symbol} />
        </div>

        {state === "idle" && (
          <div className={styles.intro}>
            <h1>Explore a gene</h1>
            <p>
              Everything the Perturb-seq datasets in GeneSetR say about one gene: what happens when it is knocked down,
              which perturbations change its expression, which perturbations look most like it, and whether its effect
              is conserved between cell types.
            </p>
            <div className={styles.examples}>
              Try:
              {EXAMPLES.map((example) => (
                <Link key={example} className={styles.chip} to={genePagePath(example)}>
                  {example}
                </Link>
              ))}
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className={styles.status} role="status">
            Reading {symbol} from all datasets…
          </div>
        )}

        {state === "notFound" && (
          <div className={styles.status} role="alert">
            <strong>{symbol}</strong> is neither a perturbation nor a measured gene in any dataset. Check the spelling
            or use the official HGNC symbol.
            {aliases.length > 0 && (
              <div className={styles.examples}>
                Did you mean:
                {aliases.map((hit) => (
                  <Link key={hit.symbol} className={styles.chip} to={genePagePath(hit.symbol)} title={hit.name}>
                    {hit.symbol}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {state === "error" && (
          <div className={styles.status} role="alert">
            Could not load {symbol}: {error}
          </div>
        )}

        {state === "ready" && summary && (
          <>
            <header className={styles.header}>
              <div className={styles.titleRow}>
                <h1>{summary.symbol}</h1>
                {info?.name && <span className={styles.geneName}>{info.name}</span>}
              </div>
              {summaryText && (
                <p className={styles.description}>
                  {showFullText || !longText ? summaryText : `${summaryText.slice(0, 420)}… `}
                  {longText && (
                    <button type="button" className={styles.textButton} onClick={() => setShowFullText((v) => !v)}>
                      {showFullText ? " Show less" : "Show more"}
                    </button>
                  )}
                </p>
              )}
              {info?.aliases?.length > 0 && (
                <p className={styles.muted}>Also known as: {info.aliases.slice(0, 10).join(", ")}</p>
              )}
              <div className={styles.links}>
                {geneLinks(summary.symbol, info).map((link) => (
                  <a key={link.label} className={styles.chip} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label} <FaExternalLinkAlt size={10} aria-hidden="true" />
                  </a>
                ))}
              </div>
              <p className={styles.muted}>
                Perturbed in {summary.perturbed_in.length} and measured in {summary.measured_in.length} of{" "}
                {summary.datasets_searched} datasets.
              </p>
            </header>

            <section className={styles.section}>
              <h2>Across datasets</h2>
              <p className={styles.help}>
                “Own expression” is the z-score of {summary.symbol} itself when it is perturbed (strongly negative
                means an efficient knock-down). “Genes changed” counts measured genes with |z| ≥{" "}
                {summary.strong_effect_z} under the perturbation; “regulators” counts perturbations that move{" "}
                {summary.symbol} by the same amount. Click a row for the details below.
              </p>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Dataset</th>
                      <th>Cell line</th>
                      <th>Type</th>
                      <th className={styles.num}>Own expression (z)</th>
                      <th className={styles.num}>Genes changed ↑ / ↓</th>
                      <th className={styles.num}>Regulators ↑ / ↓</th>
                      <th>Most similar perturbations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.datasets.map((d) => (
                      <tr
                        key={d.dataset}
                        className={d.dataset === selected ? styles.rowSelected : undefined}
                        onClick={() => setSelected(d.dataset)}
                      >
                        <td>
                          <button type="button" className={styles.rowButton} onClick={() => setSelected(d.dataset)}>
                            {d.name || d.dataset}
                          </button>
                        </td>
                        <td>{d.cell_line || "–"}</td>
                        <td>{d.perturbation_type || "–"}</td>
                        <td className={styles.num}>
                          {d.as_perturbation ? (
                            <span
                              className={styles.value}
                              style={{ background: divergingColor(d.as_perturbation.self_z, 5) }}
                            >
                              {fmt(d.as_perturbation.self_z)}
                            </span>
                          ) : (
                            <span className={styles.muted}>not perturbed</span>
                          )}
                        </td>
                        <td className={styles.num}>
                          {d.as_perturbation
                            ? `${d.as_perturbation.strong_up} / ${d.as_perturbation.strong_down}`
                            : "–"}
                        </td>
                        <td className={styles.num}>
                          {d.as_target ? `${d.as_target.strong_up} / ${d.as_target.strong_down}` : (
                            <span className={styles.muted}>not measured</span>
                          )}
                        </td>
                        <td>
                          {d.neighbours
                            ? d.neighbours.most_similar.slice(0, 4).map((row, index) => (
                                <React.Fragment key={row.perturbation}>
                                  {index > 0 && ", "}
                                  <GeneLink label={row.perturbation} />
                                </React.Fragment>
                              ))
                            : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Conservation conservation={summary.conservation} names={names} />

            {current && (
              <section className={styles.section}>
                <h2>Details in {current.name || current.dataset}</h2>
                <div className={styles.datasetChips} role="tablist" aria-label="Dataset">
                  {summary.datasets.map((d) => (
                    <button
                      key={d.dataset}
                      type="button"
                      role="tab"
                      aria-selected={d.dataset === selected}
                      className={`${styles.chip} ${d.dataset === selected ? styles.chipActive : ""}`}
                      onClick={() => setSelected(d.dataset)}
                    >
                      {d.name || d.dataset}
                    </button>
                  ))}
                </div>

                <div className={styles.openIn}>
                  <span className={styles.muted}>Open in:</span>
                  <button type="button" className={styles.action} onClick={() => open("geneRegulation", [symbol], current.dataset)}>
                    Gene Regulation
                  </button>
                  <button type="button" className={styles.action} onClick={() => open("expressionAnalyzer", [symbol], current.dataset)}>
                    Expression Analyzer
                  </button>
                  <button type="button" className={styles.action} onClick={() => open("multidataset", [symbol])}>
                    Multi-Dataset Comparison
                  </button>
                  {current.perturbed && (
                    <button type="button" className={styles.action} onClick={() => open("deregulated", [symbol], current.dataset)}>
                      Deregulated Genes
                    </button>
                  )}
                  {neighbourhood.length > 2 && (
                    <>
                      <button
                        type="button"
                        className={styles.action}
                        title="The gene and its most similar perturbations"
                        onClick={() => open("correlation", neighbourhood, current.dataset)}
                      >
                        Correlation (with neighbours)
                      </button>
                      <button
                        type="button"
                        className={styles.action}
                        title="The gene and its most similar perturbations"
                        onClick={() => open("pathfinder", neighbourhood, current.dataset)}
                      >
                        Path Explorer (with neighbours)
                      </button>
                    </>
                  )}
                </div>

                <div className={styles.columns}>
                  <div className={styles.card}>
                    <h3>When {symbol} is perturbed</h3>
                    {current.as_perturbation ? (
                      <>
                        <p className={styles.help}>Genes whose expression changes most (z-score).</p>
                        <div className={styles.cardActions}>
                          <SendToMenu
                            label="Send these genes to…"
                            datasetId={current.dataset}
                            defaultName={`${symbol} targets (${current.dataset})`}
                            genes={[...current.as_perturbation.top_up, ...current.as_perturbation.top_down].map((row) => row.gene)}
                          />
                        </div>
                        <div className={styles.pair}>
                          <RankedList title="Up-regulated" rows={current.as_perturbation.top_up} labelKey="gene" valueKey="z" limit={5} />
                          <RankedList title="Down-regulated" rows={current.as_perturbation.top_down} labelKey="gene" valueKey="z" limit={5} />
                        </div>
                      </>
                    ) : (
                      <p className={styles.muted}>{symbol} is not perturbed in this dataset.</p>
                    )}
                  </div>

                  <div className={styles.card}>
                    <h3>What changes {symbol}</h3>
                    {current.as_target ? (
                      <>
                        <p className={styles.help}>Perturbations that change its expression most (z-score).</p>
                        <div className={styles.cardActions}>
                          <SendToMenu
                            label="Send these perturbations to…"
                            datasetId={current.dataset}
                            defaultName={`${symbol} regulators (${current.dataset})`}
                            genes={[...current.as_target.top_increase, ...current.as_target.top_decrease].map((row) => baseSymbol(row.perturbation))}
                          />
                        </div>
                        <div className={styles.pair}>
                          <RankedList title="Increase it" rows={current.as_target.top_increase} labelKey="perturbation" valueKey="z" limit={5} />
                          <RankedList title="Decrease it" rows={current.as_target.top_decrease} labelKey="perturbation" valueKey="z" limit={5} />
                        </div>
                      </>
                    ) : (
                      <p className={styles.muted}>{symbol} is not among the measured genes of this dataset.</p>
                    )}
                  </div>

                  <div className={styles.card}>
                    <h3>Perturbations that look like {symbol}</h3>
                    {current.neighbours ? (
                      <>
                        <p className={styles.help}>
                          Correlation of knock-down profiles ({current.neighbours.method}). Similar profiles suggest a
                          shared complex or pathway.
                        </p>
                        <div className={styles.cardActions}>
                          <SendToMenu
                            label="Send the similar ones to…"
                            datasetId={current.dataset}
                            defaultName={`${symbol} neighbours (${current.dataset})`}
                            genes={[symbol, ...current.neighbours.most_similar.map((row) => baseSymbol(row.perturbation))]}
                          />
                        </div>
                        <div className={styles.pair}>
                          <RankedList title="Most similar" rows={current.neighbours.most_similar} labelKey="perturbation" valueKey="r" limit={1} />
                          <RankedList title="Most opposite" rows={current.neighbours.most_opposite} labelKey="perturbation" valueKey="r" limit={1} />
                        </div>
                      </>
                    ) : (
                      <p className={styles.muted}>No perturbation correlations for {symbol} in this dataset.</p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { GenePage };
