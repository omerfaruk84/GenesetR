import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { GeneSearch } from "../../components/gene-search";
import { SendToMenu } from "../../components/send-to";
import { fetchAtlasPathway, fetchAtlasPerturbationPathways, searchAtlasPathways } from "../../store/api/atlas";
import {
  PATHWAY_CONTEXT_CHOICES,
  PATHWAY_EXPORT_COLUMNS,
  PATHWAY_ROW_CHOICES,
  PERTURBATION_SET_EXPORT_COLUMNS,
  atlasPath,
  libraryName,
  pathwayExportRows,
  setKey,
} from "../../utils/atlas";
import { genePagePath } from "../../utils/geneLinks";
import { shortSetName } from "../../utils/integrated";
import { Choice, MemberMark, Score, Typeahead, plural, slug, useDebounced } from "./parts";
import styles from "./atlas-page.module.scss";

const EXAMPLE_SETS = [
  { library: "hallmark", name: "Cholesterol Homeostasis" },
  { library: "hallmark", name: "Interferon Alpha Response" },
  { library: "hallmark", name: "Oxidative Phosphorylation" },
  { library: "hallmark", name: "mTORC1 Signaling" },
  { library: "hallmark", name: "p53 Pathway" },
];
const EXAMPLE_GENES = ["SCAP", "STAT2", "MTOR", "TP53"];

const VIEWS = [
  { id: "set", label: "By gene set", about: "Which knock-downs raise or lower a gene set?" },
  { id: "gene", label: "By perturbed gene", about: "Which gene sets does one knock-down raise or lower?" },
];

/** Filter on the gene-set library, from the libraries of the summary. */
const LibrarySelect = ({ libraries, value, onChange }) => (
  <label className={styles.control}>
    Library
    <select className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All</option>
      {libraries.map((entry) => (
        <option key={entry.id} value={entry.id} title={entry.name}>
          {libraryName(entry.id)} ({entry.sets.toLocaleString("en-US")})
        </option>
      ))}
    </select>
  </label>
);

const NumberHeads = () => (
  <>
    <th className={styles.num} title="The z-scores of the datasets combined: their sum divided by the square root of their number">
      Meta z
    </th>
    <th className={styles.num} title="Datasets that have the knock-down">
      Datasets
    </th>
    <th className={styles.num} title="Cell types that show the effect on their own">
      Contexts
    </th>
  </>
);

const NumberCells = ({ row }) => (
  <>
    <td className={styles.num}>
      <Score value={row.metaZ} limit={15} />
    </td>
    <td className={styles.num}>{row.datasets ?? "–"}</td>
    <td className={styles.num}>{row.contexts ?? "–"}</td>
  </>
);

/** Knock-downs that move one gene set in one direction. */
const PerturbationCard = ({ testId, title, hint, rows, setName, to }) => (
  <div className={styles.card} data-testid={testId}>
    <div className={styles.cardHead}>
      <div>
        <h3>{title}</h3>
        <div className={styles.muted}>{hint}</div>
      </div>
      {rows.length > 0 && (
        <div className={styles.headActions}>
          <SendToMenu
            genes={rows.map((row) => row.perturbation)}
            label="Send the genes to…"
            defaultName={`Atlas: ${title}`}
            drugs={false}
          />
          <TableExportButtons
            rows={() => rows.map((row) => ({ ...row, member: row.member ? "yes" : "no" }))}
            columns={PATHWAY_EXPORT_COLUMNS.filter((column) => column.accessorKey !== "direction")}
            filename={`genesetr-atlas-${slug(setName)}-${slug(title)}`}
          />
        </div>
      )}
    </div>
    {rows.length === 0 ? (
      <div className={styles.muted}>None with these settings.</div>
    ) : (
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Perturbed gene</th>
              <NumberHeads />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.perturbation}>
                <td>
                  <Link
                    className={styles.geneLink}
                    to={to({ by: "gene", pert: row.perturbation })}
                    title={`Which gene sets does the knock-down of ${row.perturbation} move?`}
                  >
                    {row.perturbation}
                  </Link>
                  <Link className={styles.secondaryLink} to={genePagePath(row.perturbation)} title={`Open the gene page of ${row.perturbation}`}>
                    gene page
                  </Link>
                  {row.member && <MemberMark title="This gene is itself in the gene set: its own knock-down lowers the set's average" />}
                </td>
                <NumberCells row={row} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

/** Gene sets that one knock-down moves in one direction. */
const SetCard = ({ testId, title, rows, to }) => (
  <div className={styles.card} data-testid={testId}>
    <div className={styles.cardHead}>
      <h3>{title}</h3>
    </div>
    {rows.length === 0 ? (
      <div className={styles.muted}>None with these settings.</div>
    ) : (
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Gene set</th>
              <th>Library</th>
              <th className={styles.num} title="Genes in the set">
                Size
              </th>
              <NumberHeads />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={setKey(row)}>
                <td className={styles.wrap}>
                  <Link
                    className={styles.geneLink}
                    to={to({ by: "set", setLibrary: row.library, set: row.set })}
                    title={`${row.set}: which knock-downs raise or lower it?`}
                  >
                    {shortSetName(row.set)}
                  </Link>
                </td>
                <td>{libraryName(row.library)}</td>
                <td className={styles.num}>{row.size}</td>
                <NumberCells row={row} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

/** One gene set: the knock-downs that lower and that raise it. */
const SetView = ({ query, to }) => {
  const { setLibrary, set, contexts, rows } = query;
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    setAnswer(null);
    const controller = new AbortController();
    fetchAtlasPathway({ library: setLibrary, name: set, topN: rows, minContexts: contexts, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [setLibrary, set, contexts, rows]);

  if (!answer) {
    return (
      <div className={styles.status} role="status">
        Reading {shortSetName(set)}…
      </div>
    );
  }
  if (answer.status !== "found") {
    return (
      <div className={styles.status} role="alert">
        {answer.status === "error" ? answer.message : `The pathway atlas has no gene set “${set}” in ${libraryName(setLibrary)}.`}
      </div>
    );
  }
  const data = answer.data;
  return (
    <div data-testid="atlas-pathway">
      <div className={styles.cardHead} style={{ marginTop: 16 }}>
        <div>
          <h2>{data.set}</h2>
          <div className={styles.muted}>
            <span className={styles.tag}>{libraryName(data.library)}</span> {plural(data.size, "gene")} ·{" "}
            {plural(data.tested, "knock-down")} with enough datasets and contexts
          </div>
        </div>
        <div className={styles.headActions}>
          <SendToMenu genes={data.genes} label="Send the genes of the set to…" defaultName={data.set} drugs={false} />
          <TableExportButtons
            rows={() => pathwayExportRows(data)}
            columns={PATHWAY_EXPORT_COLUMNS}
            filename={`genesetr-atlas-${slug(data.set)}-knock-downs`}
          />
        </div>
      </div>
      <div className={styles.pair}>
        <PerturbationCard
          testId="atlas-pathway-down"
          title="Knock-downs that lower it"
          hint="The gene is needed for the set to be expressed"
          rows={data.down || []}
          setName={data.set}
          to={to}
        />
        <PerturbationCard
          testId="atlas-pathway-up"
          title="Knock-downs that raise it"
          hint="Repressors, or genes whose loss switches it on"
          rows={data.up || []}
          setName={data.set}
          to={to}
        />
      </div>
    </div>
  );
};

/** One perturbed gene: the gene sets its knock-down lowers and raises. */
const GeneView = ({ query, to }) => {
  const { pert, library, contexts, rows } = query;
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    setAnswer(null);
    const controller = new AbortController();
    fetchAtlasPerturbationPathways(pert, { library, topN: rows, minContexts: contexts, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pert, library, contexts, rows]);

  if (!answer) {
    return (
      <div className={styles.status} role="status">
        Reading the gene sets that {pert} moves…
      </div>
    );
  }
  if (answer.status !== "found") {
    return (
      <div className={styles.status} role="alert">
        {answer.status === "error" ? (
          answer.message
        ) : (
          <>
            <strong>{pert}</strong> is not a perturbed gene of the pathway atlas.
          </>
        )}
      </div>
    );
  }
  const data = answer.data;
  return (
    <div data-testid="atlas-perturbation-pathways">
      <div className={styles.cardHead} style={{ marginTop: 16 }}>
        <div>
          <h2>Knock-down of {data.symbol}</h2>
          <div className={styles.muted}>
            {plural(data.tested, "gene set")} with enough datasets and contexts
            {library ? ` in ${libraryName(library)}` : ""}.{" "}
            <Link className={styles.geneLink} to={genePagePath(data.symbol)}>
              Gene page of {data.symbol}
            </Link>
          </div>
        </div>
        <TableExportButtons
          rows={() => pathwayExportRows(data)}
          columns={PERTURBATION_SET_EXPORT_COLUMNS}
          filename={`genesetr-atlas-gene-sets-${data.symbol}`}
        />
      </div>
      <div className={styles.pair}>
        <SetCard testId="atlas-perturbation-down" title={`Go down when ${data.symbol} is knocked down`} rows={data.down || []} to={to} />
        <SetCard testId="atlas-perturbation-up" title={`Go up when ${data.symbol} is knocked down`} rows={data.up || []} to={to} />
      </div>
    </div>
  );
};

/**
 * Pathway activity atlas: every perturbed gene against every gene set.
 * The view, the gene set or the perturbed gene, the library filter and the
 * controls are in the address.
 */
const PathwaysTab = ({ query, summary }) => {
  const navigate = useNavigate();
  const { by, setLibrary, set, pert, library, contexts, rows } = query;
  const [typed, setTyped] = useState("");
  const [options, setOptions] = useState([]);
  const settled = useDebounced(typed.trim(), 200);
  const libraries = summary?.pathways?.libraries || [];
  const counts = summary?.pathways;

  const to = (changes) => atlasPath({ tab: "pathways", by, setLibrary, set, pert, library, contexts, rows, ...changes });

  useEffect(() => {
    if (by !== "set") return undefined;
    const controller = new AbortController();
    searchAtlasPathways(settled, { library, limit: 30, signal: controller.signal })
      .then((sets) => {
        if (!controller.signal.aborted) {
          setOptions(sets.map((entry) => ({ key: setKey(entry), label: entry.name, hint: `${libraryName(entry.library)} · ${entry.size} genes`, entry })));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [by, settled, library]);

  const chosen = by === "set" ? !!(setLibrary && set) : !!pert;

  return (
    <>
      <p className={styles.explain} data-testid="atlas-pathways-explain">
        Every perturbed gene against every gene set
        {counts ? ` (${counts.perturbations.toLocaleString("en-US")} perturbed genes, ${counts.sets.toLocaleString("en-US")} gene sets)` : ""}: in each
        dataset the average of the set under the knock-down is compared with the rest of the profile.{" "}
        <strong>Meta z</strong> combines the datasets; <strong>Contexts</strong> is the number of cell types that agree
        {counts?.contexts ? `, of ${counts.contexts.length}` : ""}. “Programmes” are GeneSetR’s own co-regulation
        programmes from the Modules tab.
      </p>
      <div className={styles.subTabs} role="tablist" aria-label="Direction of the question">
        {VIEWS.map((view) => (
          <Link
            key={view.id}
            role="tab"
            aria-selected={by === view.id}
            className={by === view.id ? styles.chipActive : styles.chip}
            title={view.about}
            to={to({ by: view.id })}
          >
            {view.label}
          </Link>
        ))}
      </div>

      <div className={styles.toolbar}>
        {by === "set" ? (
          <Typeahead
            wide
            label="Search a gene set"
            placeholder="Search a gene set, e.g. cholesterol"
            initialValue={set}
            options={options}
            onText={setTyped}
            onChoose={(option) => navigate(to({ by: "set", setLibrary: option.entry.library, set: option.entry.name }))}
          />
        ) : (
          <GeneSearch placeholder="Perturbed gene, e.g. SCAP" initialValue={pert} onSelect={(symbol) => navigate(to({ by: "gene", pert: symbol }))} />
        )}
        <LibrarySelect libraries={libraries} value={library} onChange={(value) => navigate(to({ library: value }), { replace: true })} />
      </div>
      <div className={styles.controls}>
        <Choice
          label="Minimum contexts"
          title="A row is listed only when at least this many cell types show the effect on their own"
          choices={PATHWAY_CONTEXT_CHOICES}
          value={contexts}
          onChange={(value) => navigate(to({ contexts: value }), { replace: true })}
        />
        <Choice
          label="Rows"
          title="Rows per table"
          choices={PATHWAY_ROW_CHOICES}
          value={rows}
          onChange={(value) => navigate(to({ rows: value }), { replace: true })}
        />
      </div>

      {!chosen && (
        <div className={styles.row}>
          <span className={styles.muted}>Try:</span>
          {by === "set"
            ? EXAMPLE_SETS.map((entry) => (
                <Link key={setKey(entry)} className={styles.chip} to={to({ setLibrary: entry.library, set: entry.name })}>
                  {entry.name}
                </Link>
              ))
            : EXAMPLE_GENES.map((symbol) => (
                <Link key={symbol} className={styles.chip} to={to({ pert: symbol })}>
                  {symbol}
                </Link>
              ))}
        </div>
      )}
      {chosen && by === "set" && <SetView query={query} to={to} />}
      {chosen && by === "gene" && <GeneView query={query} to={to} />}
    </>
  );
};

export { PathwaysTab };
