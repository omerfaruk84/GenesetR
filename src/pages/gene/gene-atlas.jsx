import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAtlasGene } from "../../store/api/atlas";
import { ATLAS_AXES, AXIS_TEXT, atlasPath, evidenceName, libraryName, percent, visiblePredictions } from "../../utils/atlas";
import { shortSetName } from "../../utils/integrated";
import styles from "./gene-page.module.scss";

const TOP = 5;

/**
 * "Function atlas" on the gene page: the module of the gene on the two maps
 * and its strongest predicted functions. Predictions that are already an
 * annotation, or that rest on a partner in the same chromosome band, are left
 * out. Renders nothing when the gene is on neither map or the request fails.
 */
const GeneAtlas = ({ symbol }) => {
  const [gene, setGene] = useState(null);

  useEffect(() => {
    setGene(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    fetchAtlasGene(symbol, { topN: TOP, signal: controller.signal })
      .then((answer) => {
        if (!controller.signal.aborted) setGene(answer.status === "found" ? answer.data : null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [symbol]);

  if (!gene) return null;
  const places = ATLAS_AXES.map((axis) => ({ axis, side: gene.maps?.[axis] })).filter((entry) => entry.side?.position);
  const predictions = visiblePredictions(gene.predictions, { novelOnly: true, limit: TOP });
  if (places.length === 0 && predictions.rows.length === 0) return null;
  const firstAxis = places[0]?.axis || "pert";

  return (
    <section className={styles.section} data-testid="gene-atlas">
      <h2>Function atlas</h2>
      <p className={styles.help}>
        Where {gene.symbol} sits among all genes: on the knock-down map with the genes whose loss has the same
        consequences, on the co-regulation map with the genes that respond to the same perturbations. A predicted
        function says that {gene.symbol} behaves like the genes of a set, not that it is a member; the confidence is
        the share of equally strong predictions that are an existing annotation (a lower bound).
      </p>
      <div className={styles.openIn}>
        <Link className={styles.action} to={atlasPath({ tab: "map", axis: firstAxis, gene: gene.symbol, module: places[0]?.side.position.module?.id })}>
          Open in the Function atlas
        </Link>
      </div>
      <div className={styles.columns}>
        <div className={styles.card}>
          <h3>On the maps</h3>
          {places.length === 0 && <p className={styles.muted}>On neither map: too few reproducible partners.</p>}
          {places.map(({ axis, side }) => {
            const module = side.position.module;
            const partners = (side.partners || []).slice(0, TOP).map((row) => row.symbol);
            return (
              <p key={axis} className={styles.help} data-testid={`gene-atlas-${axis}`}>
                <strong>{AXIS_TEXT[axis].map}:</strong>{" "}
                {module ? (
                  <Link className={styles.geneLink} to={atlasPath({ tab: "map", axis, gene: gene.symbol, module: module.id })}>
                    {module.name}
                  </Link>
                ) : (
                  <Link className={styles.geneLink} to={atlasPath({ tab: "map", axis, gene: gene.symbol })}>
                    in no {AXIS_TEXT[axis].module}
                  </Link>
                )}
                {module ? ` (${module.size} genes)` : ""}
                {partners.length > 0 ? `. Closest: ${partners.join(", ")}` : ""}
              </p>
            );
          })}
        </div>
        <div className={styles.card}>
          <h3>Predicted functions</h3>
          {predictions.rows.length === 0 ? (
            <p className={styles.muted}>No new function is predicted at a confidence of 10% or more.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table} data-testid="gene-atlas-predictions">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Evidence</th>
                    <th className={styles.num}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.rows.map((row) => (
                    <tr
                      key={`${row.evidence}|${row.library}|${row.term}`}
                      style={{ cursor: "default" }}
                      title={`${row.term}. Supported by ${(row.support || []).join(", ")}`}
                    >
                      <td>
                        {shortSetName(row.term)} <span className={styles.muted}>{libraryName(row.library)}</span>
                      </td>
                      <td>{evidenceName(row.evidence)}</td>
                      <td className={styles.num}>{percent(row.confidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export { GeneAtlas };
