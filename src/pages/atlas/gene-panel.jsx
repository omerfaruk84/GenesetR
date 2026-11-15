import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { fetchAtlasGene } from "../../store/api/atlas";
import {
  AXIS_TEXT,
  PREDICTION_EXPORT_COLUMNS,
  atlasPath,
  evidenceName,
  libraryName,
  predictionExportRows,
  visiblePredictions,
} from "../../utils/atlas";
import { genePagePath } from "../../utils/geneLinks";
import { integratedPath, shortSetName } from "../../utils/integrated";
import { Confidence, NeighbourMark, fmt, plural } from "./parts";
import styles from "./atlas-page.module.scss";

const PREDICTIONS_SHOWN = 8;

const PARTNER_COLUMNS = [
  { accessorKey: "symbol", header: "Partner" },
  { accessorKey: "score", header: "Evidence score" },
  { accessorKey: "r", header: "Mean correlation" },
  { accessorKey: "datasets", header: "Datasets" },
  { accessorKey: "sameBand", header: "Same chromosome band" },
];

/** Where a gene sits on one map: its module, or why it is not on the map. */
const Place = ({ axis, side, current, to }) => {
  const words = AXIS_TEXT[axis];
  const module = side?.position?.module;
  const link = (moduleId) => to({ axis, module: moduleId });
  return (
    <li data-testid={`atlas-gene-place-${axis}`}>
      <strong>{words.map}:</strong> {!side?.present && `not among the ${axis === "pert" ? "perturbed" : "measured"} genes of the atlas.`}
      {side?.present && !side.position && "not on the map: too few reproducible partners."}
      {side?.position && !module && `on the map (${plural(side.position.links, "link")}), in no ${words.module}.`}
      {module && (
        <>
          <Link className={styles.geneLink} to={link(module.id)} title={`Highlight the ${words.module} on the ${words.map.toLowerCase()}`}>
            {module.name}
          </Link>{" "}
          <span className={styles.muted}>
            ({plural(module.size, "gene")}; {plural(side.position.links, "link")})
          </span>
        </>
      )}
      {side?.position && !current && (
        <Link className={styles.secondaryLink} to={link(module?.id || 0)}>
          open that map
        </Link>
      )}
    </li>
  );
};

/**
 * One gene of the atlas: what is known about it, its module on both maps,
 * its strongest partners on the shown map and its predicted functions.
 * The address holds the gene, the map and the neighbour switch:
 * `to(changes)` gives the address of the map with some of them changed.
 */
const GenePanel = ({
  symbol,
  axis,
  neighbours = false,
  to = (changes) => atlasPath({ tab: "map", axis, gene: symbol, neighbours, ...changes }),
}) => {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState(null);
  const [allPredictions, setAllPredictions] = useState(false);

  useEffect(() => {
    setAnswer(null);
    setAllPredictions(false);
    const controller = new AbortController();
    fetchAtlasGene(symbol, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol]);

  if (!answer) {
    return (
      <div className={styles.card} role="status">
        Reading {symbol} from the atlas…
      </div>
    );
  }
  if (answer.status !== "found") {
    return (
      <div className={styles.card} role="alert" data-testid="atlas-gene-missing">
        {answer.status === "error" ? (
          answer.message
        ) : (
          <>
            <strong>{symbol}</strong> is on neither map: it has too few reproducible partners, as a knock-down and as a measured gene.{" "}
            <Link to={genePagePath(symbol)}>Gene page of {symbol}</Link>
          </>
        )}
      </div>
    );
  }

  const gene = answer.data;
  const words = AXIS_TEXT[axis];
  const side = gene.maps?.[axis];
  const partners = side?.partners || [];
  const predictions = visiblePredictions(gene.predictions, { includeNeighbours: neighbours });
  const shown = allPredictions ? predictions.rows : predictions.rows.slice(0, PREDICTIONS_SHOWN);

  return (
    <div className={styles.card} data-testid="atlas-gene-panel">
      <div className={styles.cardHead}>
        <div>
          <div className={styles.geneTitle}>
            <h3>{gene.symbol}</h3>
            {gene.name && gene.name !== gene.symbol && <span className={styles.muted}>{gene.name}</span>}
          </div>
          <div className={styles.row}>
            <span className={styles.tag} title="Number of GO Biological Process terms the gene is annotated with">
              {gene.annotations > 0 ? plural(gene.annotations, "GO term") : "no GO term"}
            </span>
            {gene.uncharacterised && (
              <span
                className={`${styles.tag} ${styles.tagWarn}`}
                title="The name does not say what the gene does (open reading frame, FAM, KIAA and the like)"
              >
                placeholder name
              </span>
            )}
          </div>
        </div>
        <div className={styles.headActions}>
          <Link className={styles.action} to={genePagePath(gene.symbol)}>
            Gene page
          </Link>
          <Link
            className={styles.action}
            to={integratedPath({ mode: "gene", symbol: gene.symbol })}
            title="Consensus targets and regulators over all datasets"
          >
            Integrated view
          </Link>
        </div>
      </div>

      <ul className={styles.facts}>
        <Place axis="pert" side={gene.maps?.pert} current={axis === "pert"} to={to} />
        <Place axis="genes" side={gene.maps?.genes} current={axis === "genes"} to={to} />
      </ul>

      <div className={styles.sections}>
        <div>
          <div className={styles.cardHead} style={{ marginTop: 14 }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Closest partners ({words.label.toLowerCase()})</h4>
              <div className={styles.muted}>
                {axis === "pert"
                  ? "Genes whose knock-down has the same consequences. The score adds up the evidence of the datasets that have both."
                  : "Genes that respond to the same perturbations. The score adds up the evidence of the datasets that measure both."}
              </div>
            </div>
            {partners.length > 0 && (
              <div className={styles.headActions}>
                <SendToMenu
                  genes={[gene.symbol, ...partners.map((row) => row.symbol)]}
                  label="Send the genes to…"
                  defaultName={`Atlas: ${gene.symbol} and partners`}
                  drugs={false}
                />
                <TableExportButtons
                  rows={() => partners.map((row) => ({ ...row, sameBand: row.sameBand ? "yes" : "no" }))}
                  columns={PARTNER_COLUMNS}
                  filename={`genesetr-atlas-partners-${gene.symbol}-${axis}`}
                />
              </div>
            )}
          </div>
          {partners.length === 0 ? (
            <div className={styles.muted}>No partner above the threshold.</div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table} data-testid="atlas-gene-partners">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th
                      className={styles.num}
                      title="Evidence over the datasets: weighted sum of the similarity in each, in units of its noise"
                    >
                      Score
                    </th>
                    <th className={styles.num} title="Weighted mean correlation over the datasets that have both genes">
                      Mean r
                    </th>
                    <th className={styles.num} title="Datasets that have both genes">
                      Datasets
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((row) => (
                    <tr key={row.symbol}>
                      <td>
                        <Link className={styles.geneLink} to={to({ gene: row.symbol })} title={`Show ${row.symbol} on the map`}>
                          {row.symbol}
                        </Link>
                        {row.sameBand && <NeighbourMark />}
                      </td>
                      <td className={styles.num}>{fmt(row.score, 1)}</td>
                      <td className={styles.num}>{fmt(row.r, 3)}</td>
                      <td className={styles.num}>{row.datasets ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <div className={styles.cardHead} style={{ marginTop: 14 }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Predicted functions</h4>
              <div className={styles.muted}>
                What the partners on both maps have in common: {gene.symbol} behaves like the genes of these sets, which is not the same as
                being a member.
              </div>
            </div>
            {predictions.rows.length > 0 && (
              <TableExportButtons
                rows={() => predictionExportRows(predictions.rows)}
                columns={PREDICTION_EXPORT_COLUMNS}
                filename={`genesetr-atlas-predictions-${gene.symbol}`}
              />
            )}
          </div>
          {predictions.flagged > 0 && (
            <div className={styles.row}>
              <label className={styles.check}>
                <input type="checkbox" checked={neighbours} onChange={() => navigate(to({ neighbours: !neighbours }), { replace: true })} />
                Include possible neighbour effects
              </label>
              {predictions.hidden > 0 && (
                <span className={styles.muted} data-testid="atlas-gene-hidden">
                  {plural(predictions.hidden, "prediction")} hidden: they rest on a partner in the same chromosome band.
                </span>
              )}
            </div>
          )}
          {predictions.rows.length === 0 ? (
            <div className={styles.muted} style={{ marginTop: 6 }}>
              No predicted function at a confidence of 10% or more.
            </div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table} data-testid="atlas-gene-predictions">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Library</th>
                    <th>Evidence</th>
                    <th className={styles.num}>Confidence</th>
                    <th className={styles.num} title="Partners that have the function, of the partners that vote">
                      Partners
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr
                      key={`${row.evidence}|${row.library}|${row.term}`}
                      title={`${row.term}. Supported by ${(row.support || []).join(", ")}`}
                    >
                      <td className={styles.wrap}>
                        {shortSetName(row.term)}
                        {row.known && (
                          <span className={styles.mark} title="Already an annotation of the gene">
                            known
                          </span>
                        )}
                        {(row.neighbours || []).length > 0 && <NeighbourMark genes={row.neighbours} />}
                      </td>
                      <td>{libraryName(row.library)}</td>
                      <td>{evidenceName(row.evidence)}</td>
                      <td className={styles.num}>
                        <Confidence value={row.confidence} />
                      </td>
                      <td className={styles.num}>
                        {row.overlap} of {row.partners}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {predictions.rows.length > PREDICTIONS_SHOWN && (
            <div className={styles.row}>
              <button type="button" className={styles.linkButton} onClick={() => setAllPredictions((value) => !value)}>
                {allPredictions ? "Show fewer" : `Show all ${predictions.rows.length} predictions`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { GenePanel };
