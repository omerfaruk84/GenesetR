import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { GeneSearch } from "../../components/gene-search";
import { fetchIntegratedGene, fetchIntegratedPathways, fetchIntegratedPerturbation } from "../../store/api/integrated";
import { genePagePath } from "../../utils/geneLinks";
import { coverageText, integratedPath } from "../../utils/integrated";
import { ContextSpecificCard, Controls, Explain, OverexpressionCards, PathwaysBlock, ResultCard, Score, geneModeLink } from "./parts";
import styles from "./integrated-page.module.scss";

const EXAMPLES = ["ATF4", "HMGCR", "MED12", "SQLE", "LDLR"];

const Coverage = ({ verb, data }) => (
  <div className={styles.row} data-testid="integrated-coverage">
    <span className={styles.muted}>{coverageText(verb, data)}:</span>
    {(data.contexts || []).map((context) => (
      <span key={context} className={styles.tag}>
        {context}
      </span>
    ))}
  </div>
);

/** "What does perturbing X do everywhere?" */
const PerturbationView = ({ symbol, data, names, contextOf, controls }) => {
  const asMeasured = geneModeLink("measured", controls);
  const asPerturbation = geneModeLink("perturbation", controls);
  const tables = { names, contextOf, nameHeader: "Measured gene", linkTo: asMeasured, linkTitle: (name) => `What controls ${name} everywhere?` };
  const partners = data.partners || [];
  const strength = data.strength || [];
  const [pathways, setPathways] = useState(null);
  useEffect(() => {
    setPathways(null);
    const controller = new AbortController();
    fetchIntegratedPathways(symbol, { signal: controller.signal }).then((answer) => {
      if (!controller.signal.aborted) setPathways(answer);
    });
    return () => controller.abort();
  }, [symbol]);
  return (
    <>
      <Coverage verb="Perturbed" data={data} />
      <div className={styles.pair}>
        <ResultCard
          {...tables}
          testId="integrated-targets-up"
          title={`Go up when ${symbol} is knocked down`}
          hint={`Consensus over the datasets that perturb ${symbol}; ${data.targets?.tested ?? 0} genes tested`}
          rows={data.targets?.up}
          empty="No gene goes up reproducibly with these settings."
        />
        <ResultCard
          {...tables}
          testId="integrated-targets-down"
          title={`Go down when ${symbol} is knocked down`}
          hint={`${symbol} itself is listed when its knock-down is measured`}
          rows={data.targets?.down}
          empty="No gene goes down reproducibly with these settings."
        />
      </div>
      {pathways && <PathwaysBlock symbol={symbol} data={pathways} />}
      <div className={styles.pair}>
        <ContextSpecificCard
          testId="integrated-context-specific"
          title="Specific to one context"
          hint={`Genes that respond to the loss of ${symbol} in one cell context and not in the others`}
          rows={data.contextSpecific}
          nameHeader="Measured gene"
          linkTo={asMeasured}
        />
        <div className={styles.tableCard} data-testid="integrated-partners">
          <div className={styles.tableHead}>
            <div>
              <h3>Reproducible partners</h3>
              <div className={styles.muted}>
                Perturbations whose profiles correlate with that of {symbol} in at least two datasets
              </div>
            </div>
            {partners.length > 0 && (
              <TableExportButtons
                rows={partners}
                columns={[
                  { accessorKey: "perturbation", header: "Perturbation" },
                  { accessorKey: "r", header: "Mean correlation" },
                  { accessorKey: "datasets", header: "Datasets" },
                ]}
                filename={`genesetr-integrated-partners-${symbol}`}
              />
            )}
          </div>
          {partners.length === 0 ? (
            <div className={styles.muted}>None</div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Perturbation</th>
                    <th className={styles.num} title="Mean correlation between the two knock-down profiles over the datasets that have both">
                      Mean r
                    </th>
                    <th className={styles.num} title="Datasets that perturb both genes">
                      Datasets
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((row) => (
                    <tr key={row.perturbation}>
                      <td>
                        <Link className={styles.geneLink} to={asPerturbation(row.perturbation)}>
                          {row.perturbation}
                        </Link>
                      </td>
                      <td className={styles.num}>
                        <Score value={row.r} limit={1} digits={3} />
                      </td>
                      <td className={styles.num}>{row.datasets ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {strength.length > 0 && (
        <div className={styles.pair}>
          <div className={styles.tableCard} data-testid="integrated-strength">
            <div className={styles.tableHead}>
              <div>
                <h3>Strength per dataset</h3>
                <div className={styles.muted}>
                  On-target z is the z-score of {symbol} itself. Impact is the mean squared z over all measured genes
                  minus 1: about 0 for a perturbation without effect.
                </div>
              </div>
              <TableExportButtons
                rows={() => strength.map((row) => ({ ...row, name: names[row.dataset] || row.dataset, context: contextOf[row.dataset] || "" }))}
                columns={[
                  { accessorKey: "dataset", header: "Dataset id" },
                  { accessorKey: "name", header: "Dataset" },
                  { accessorKey: "context", header: "Context" },
                  { accessorKey: "cells", header: "Cells" },
                  { accessorKey: "self_z", header: "On-target z" },
                  { accessorKey: "genes_strong", header: "Strongly changed genes" },
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
                    <th className={styles.num}>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {strength.map((row) => (
                    <tr key={row.dataset}>
                      <td>{names[row.dataset] || row.dataset}</td>
                      <td>{contextOf[row.dataset] ? <span className={styles.tag}>{contextOf[row.dataset]}</span> : "–"}</td>
                      <td className={styles.num}>{typeof row.cells === "number" ? Math.round(row.cells).toLocaleString("en-US") : "–"}</td>
                      <td className={styles.num}>
                        {typeof row.self_z === "number" ? <Score value={row.self_z} limit={10} /> : "–"}
                      </td>
                      <td className={styles.num}>
                        {row.genes_strong ?? "–"}
                        {row.genes_measured ? <span className={styles.muted}> of {row.genes_measured.toLocaleString("en-US")}</span> : ""}
                      </td>
                      <td className={styles.num}>{typeof row.impact === "number" ? row.impact.toFixed(3) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/** "What controls X everywhere?" */
const MeasuredView = ({ symbol, data, names, contextOf, controls }) => {
  const asPerturbation = geneModeLink("perturbation", controls);
  const tables = {
    names,
    contextOf,
    nameHeader: "Perturbed gene",
    linkTo: asPerturbation,
    linkTitle: (name) => `What does perturbing ${name} do everywhere?`,
    sendLabel: "Send the perturbed genes to…",
  };
  return (
    <>
      <Coverage verb="Measured" data={data} />
      <div className={styles.pair}>
        <ResultCard
          {...tables}
          testId="integrated-regulators-down"
          title={`Needed for ${symbol}: knock-down lowers it`}
          hint={`${data.regulators?.tested ?? 0} perturbed genes tested; ${symbol} itself is listed when it is perturbed`}
          rows={data.regulators?.down}
          empty={`No knock-down lowers ${symbol} reproducibly with these settings.`}
        />
        <ResultCard
          {...tables}
          testId="integrated-regulators-up"
          title={`Hold ${symbol} down: knock-down raises it`}
          hint="Often genes whose loss stresses the cell, as well as direct repressors"
          rows={data.regulators?.up}
          empty={`No knock-down raises ${symbol} reproducibly with these settings.`}
        />
      </div>
      <div className={styles.pair}>
        <ContextSpecificCard
          testId="integrated-context-specific"
          title="Specific to one context"
          hint={`Knock-downs that change ${symbol} in one cell context and not in the others`}
          rows={data.contextSpecific}
          nameHeader="Perturbed gene"
          linkTo={asPerturbation}
        />
      </div>
      <h2 className={styles.sectionTitle}>TFs whose overexpression changes {symbol}</h2>
      <OverexpressionCards
        overexpression={data.overexpression}
        names={names}
        subject={`${symbol} is`}
        groups={[
          { key: "up", title: `Overexpression raises ${symbol}` },
          { key: "down", title: `Overexpression lowers ${symbol}` },
        ]}
      />
    </>
  );
};

const VIEWS = [
  { id: "perturbation", label: "As a perturbation", question: (symbol) => `What does perturbing ${symbol} do everywhere?` },
  { id: "measured", label: "As a measured gene", question: (symbol) => `What controls ${symbol} everywhere?` },
];

/**
 * Gene mode: one symbol, seen as a perturbation and as a measured gene.
 * The symbol, the view and the controls are in the address.
 */
const GeneMode = ({ query, summary, names, contextOf }) => {
  const navigate = useNavigate();
  const { symbol, view, minContexts, rows } = query;
  const controls = { minContexts, rows };
  const [sides, setSides] = useState(null); // { perturbation, measured } once both are answered

  useEffect(() => {
    setSides(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    const options = { topN: rows, minContexts, signal: controller.signal };
    Promise.all([fetchIntegratedPerturbation(symbol, options), fetchIntegratedGene(symbol, options)])
      .then(([perturbation, measured]) => {
        if (!controller.signal.aborted) setSides({ perturbation, measured });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol, minContexts, rows]);

  const found = (id) => sides?.[id]?.status === "found";
  const other = view === "perturbation" ? "measured" : "perturbation";
  // A gene that is missing on the requested side is shown from the other side
  const shown = sides && !found(view) && found(other) ? other : view;
  const failed = sides?.[view]?.status === "error" ? sides[view].message : "";

  return (
    <>
      <Explain summary={summary}>
        Type a gene once and see it from both sides: what its knock-down changes in every dataset that perturbs it,
        and which knock-downs change its expression in every dataset that measures it.
      </Explain>
      <div className={styles.searchRow}>
        <GeneSearch
          size="lg"
          autoFocus={!symbol}
          initialValue={symbol}
          onSelect={(chosen) => navigate(integratedPath({ mode: "gene", symbol: chosen, view, ...controls }))}
        />
      </div>
      {!symbol && (
        <div className={styles.row}>
          <span className={styles.muted}>Try:</span>
          {EXAMPLES.map((example) => (
            <Link key={example} className={styles.chip} to={integratedPath({ mode: "gene", symbol: example })}>
              {example}
            </Link>
          ))}
        </div>
      )}

      {symbol && (
        <>
          <div className={styles.geneHead}>
            <h2>{symbol}</h2>
          </div>
          <div className={styles.subTabs} role="tablist" aria-label={`Views of ${symbol}`}>
            {VIEWS.map((entry) => (
              <Link
                key={entry.id}
                role="tab"
                aria-selected={shown === entry.id}
                className={shown === entry.id ? styles.chipActive : styles.chip}
                title={entry.question(symbol)}
                to={integratedPath({ mode: "gene", symbol, view: entry.id, ...controls })}
              >
                {entry.label}
              </Link>
            ))}
            <Link className={styles.action} to={genePagePath(symbol)}>
              Gene page of {symbol}
            </Link>
          </div>
          <Controls
            minContexts={minContexts}
            rows={rows}
            onChange={(next) => navigate(integratedPath({ mode: "gene", symbol, view, ...next }))}
          />

          {!sides && (
            <div className={styles.status} role="status">
              Reading {symbol} from all datasets…
            </div>
          )}
          {sides && !found("perturbation") && !found("measured") && (
            <div className={styles.status} role="alert">
              {failed || (
                <>
                  <strong>{symbol}</strong> is neither perturbed nor measured in the integrated datasets. Check the
                  spelling or use the official HGNC symbol.
                </>
              )}
            </div>
          )}
          {sides && shown !== view && (
            <div className={styles.warning} role="status" data-testid="integrated-other-view">
              {sides[view].status === "error"
                ? `${VIEWS.find((entry) => entry.id === view).label}: ${sides[view].message}`
                : view === "perturbation"
                  ? `${symbol} is not perturbed in any integrated dataset.`
                  : `${symbol} is not measured in any integrated dataset.`}{" "}
              Shown {shown === "measured" ? "as a measured gene" : "as a perturbation"} instead.
            </div>
          )}
          {sides && found(shown) && shown === "perturbation" && (
            <PerturbationView symbol={symbol} data={sides.perturbation.data} names={names} contextOf={contextOf} controls={controls} />
          )}
          {sides && found(shown) && shown === "measured" && (
            <MeasuredView symbol={symbol} data={sides.measured.data} names={names} contextOf={contextOf} controls={controls} />
          )}
        </>
      )}
    </>
  );
};

export { GeneMode };
