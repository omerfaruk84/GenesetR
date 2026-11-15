import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { LocalEnrichment } from "../../components/local-enrichment";
import { SendToMenu } from "../../components/send-to";
import { fetchInteractionPair } from "../../store/api/interactions";
import { genePagePath } from "../../utils/geneLinks";
import { KIND_TEXT, interactionGeneColumns, kindLabel, pairReading, sharedExtent } from "../../utils/interactions";
import { PairChart } from "./pair-chart";
import { ClassName, count, fmt, formatQ, plural, slug } from "./parts";
import styles from "./interactions-page.module.scss";

const TOP_N = 200;
const ROWS_SHOWN = 25;

const Z = ({ value }) => (
  <span className={value > 0 ? styles.up : value < 0 ? styles.down : undefined}>{typeof value === "number" ? value.toFixed(1) : "–"}</span>
);

/** Genes on one side of the sum: table, export, "Send to" and enrichment. */
const GeneList = ({ testId, title, hint, rows, pair }) => {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, ROWS_SHOWN);
  const genes = rows.map((row) => row.gene);
  const name = `${pair.a}+${pair.b}: ${title.toLowerCase()}`;
  return (
    <div className={styles.card} data-testid={testId}>
      <div className={styles.cardHead}>
        <div>
          <h3>{title}</h3>
          <div className={styles.muted}>
            {hint}
            {rows.length > 0 ? ` ${rows.length >= TOP_N ? `The ${TOP_N} strongest genes` : plural(rows.length, "gene")}.` : ""}
          </div>
        </div>
        {rows.length > 0 && (
          <div className={styles.headActions}>
            <SendToMenu genes={genes} label="Send the genes to…" defaultName={name} drugs={false} />
            <TableExportButtons
              rows={rows}
              columns={interactionGeneColumns(pair.a, pair.b)}
              filename={`genesetr-interaction-${slug(`${pair.a}-${pair.b}`)}-${slug(title)}`}
            />
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <div className={styles.muted}>No gene at a false discovery rate of {Math.round(100 * (pair.fdr ?? 0.05))} %.</div>
      ) : (
        <>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gene</th>
                  <th title="How the change in the pair compares with the sum of the two single genes">Compared with the sum</th>
                  <th className={styles.num} title={`z-score of the gene when ${pair.a} alone is switched on`}>
                    z {pair.a}
                  </th>
                  <th className={styles.num} title={`z-score of the gene when ${pair.b} alone is switched on`}>
                    z {pair.b}
                  </th>
                  <th className={styles.num} title="z-score of the gene when both are switched on">
                    z pair
                  </th>
                  <th className={styles.num} title="Change in the pair minus the sum of the two single genes, divided by its standard error">
                    Interaction z
                  </th>
                  <th className={styles.num} title="False discovery rate (Benjamini-Hochberg over the measured genes)">
                    q
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.gene}>
                    <td>
                      <Link className={styles.geneLink} to={genePagePath(row.gene)} title={`Open the gene page of ${row.gene}`}>
                        {row.gene}
                      </Link>
                    </td>
                    <td title={KIND_TEXT[row.kind]?.about}>{kindLabel(row.kind)}</td>
                    <td className={styles.num}>
                      <Z value={row.zA} />
                    </td>
                    <td className={styles.num}>
                      <Z value={row.zB} />
                    </td>
                    <td className={styles.num}>
                      <Z value={row.zPair} />
                    </td>
                    <td className={styles.num}>{fmt(row.interactionZ, 1)}</td>
                    <td className={styles.num}>{formatQ(row.q)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > ROWS_SHOWN && (
            <button type="button" className={styles.linkButton} onClick={() => setAll((value) => !value)}>
              {all ? `Show the first ${ROWS_SHOWN}` : `Show all ${rows.length}`}
            </button>
          )}
          <div className={styles.below}>
            <LocalEnrichment
              genes={genes}
              label={`Enrichment of these ${genes.length} genes`}
              filename={`genesetr-interaction-enrichment-${slug(`${pair.a}-${pair.b}`)}-${slug(title)}`}
            />
          </div>
        </>
      )}
    </div>
  );
};

/**
 * One pair: the result in words, its numbers, the expected-versus-observed
 * plot and the genes on both sides of the sum.
 *   dataset, a, b   the pair, from the address
 *   to              (changes) => address of the page
 *   how             "How to read this", shown next to the numbers
 */
const PairPanel = ({ dataset, a, b, labels, to, how = null }) => {
  const [answer, setAnswer] = useState(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    setAnswer(null);
    const controller = new AbortController();
    fetchInteractionPair(dataset, a, b, { topN: TOP_N, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [dataset, a, b]);

  // a chosen pair is shown below the overview: bring it into view once its content is there
  const loaded = !!answer;
  useEffect(() => {
    if (loaded && sectionRef.current?.scrollIntoView) sectionRef.current.scrollIntoView({ block: "start" });
  }, [loaded, a, b]);

  let body;
  if (!answer) {
    body = (
      <div className={styles.status} role="status">
        Reading {a} + {b}…
      </div>
    );
  } else if (answer.status !== "found") {
    body = (
      <div className={styles.status} role="alert" data-testid="interaction-pair-missing">
        {answer.status === "error" ? (
          answer.message
        ) : (
          <>
            The pair <strong>{a} + {b}</strong> was not measured in this dataset.{" "}
            <Link className={styles.geneLink} to={to({ q: a, a: "", b: "", cls: "" })}>
              Pairs of {a}
            </Link>
            {" · "}
            <Link className={styles.geneLink} to={to({ q: b, a: "", b: "", cls: "" })}>
              Pairs of {b}
            </Link>
          </>
        )}
      </div>
    );
  } else {
    const pair = answer.data;
    const reading = pairReading(pair, { fdr: pair.fdr });
    const { outside } = sharedExtent(pair.points, { exclude: [pair.a, pair.b] });
    body = (
      <div data-testid="interaction-pair">
        <div className={styles.pairHead}>
          <h2>
            {pair.a} + {pair.b}
          </h2>
          <span className={styles.tag}>
            <ClassName id={pair.class} labels={labels} />
          </span>
          <span className={styles.pairLinks}>
            {[pair.a, pair.b].map((gene) => (
              <React.Fragment key={gene}>
                <Link className={styles.secondaryLink} to={genePagePath(gene)}>
                  Gene page of {gene}
                </Link>
                <Link className={styles.secondaryLink} to={to({ q: gene, a: "", b: "", cls: "" })}>
                  All pairs of {gene}
                </Link>
              </React.Fragment>
            ))}
          </span>
        </div>
        <p className={styles.reading} data-testid="interaction-reading">
          {reading.join(" ")}
        </p>
        <div className={styles.pairLayout}>
          <div className={styles.chartCard} data-testid="interaction-pair-chart">
            <PairChart pair={pair} />
            <div className={styles.chartNote}>
              Each point is a measured gene ({count(pair.points?.gene?.length)} that respond most). On the line the pair equals the sum of
              the two genes alone. <span className={styles.up}>Above the line</span>: higher in the pair than the sum;{" "}
              <span className={styles.down}>below</span>: lower. Coloured points deviate at a false discovery rate of{" "}
              {Math.round(100 * (pair.fdr ?? 0.05))} %. Scroll to zoom.
              {outside.length > 0 && (
                <span data-testid="interaction-outside">
                  {" "}
                  Outside the plot, because {outside.length === 1 ? "it is" : "they are"} switched on directly:{" "}
                  {outside.map((row) => `${row.gene} (sum ${row.expected.toFixed(1)}, pair ${row.observed.toFixed(1)})`).join(", ")}.
                </span>
              )}
            </div>
          </div>
          <div>
            <dl className={styles.facts} data-testid="interaction-facts">
            <div>
              <dt title="The pair's response as a mix of the two single responses">Weights</dt>
              <dd>
                {pair.a} {fmt(pair.coefficients?.a)} · {pair.b} {fmt(pair.coefficients?.b)}
              </dd>
            </div>
            <div>
              <dt title="Share of the pair's response that the mix explains">Fit</dt>
              <dd>
                {fmt(pair.fit)} <span className={styles.muted}>(plain sum: {fmt(pair.additiveFit)})</span>
              </dd>
            </div>
            <div>
              <dt title="Size of the pair's response divided by the size of the sum of the two single responses">Magnitude</dt>
              <dd>{fmt(pair.magnitude)}</dd>
            </div>
            <div>
              <dt title="Correlation of the two single responses">Similarity of the two genes</dt>
              <dd>{fmt(pair.similarity)}</dd>
            </div>
            <div>
              <dt title="Genes with |z| of 3 or more">Responding genes</dt>
              <dd>
                {pair.a} {count(pair.strongGenes?.a)} · {pair.b} {count(pair.strongGenes?.b)} · pair {count(pair.strongGenes?.pair)}
              </dd>
            </div>
            <div>
              <dt>Cells</dt>
              <dd>
                {pair.a} {count(pair.cells?.a)} · {pair.b} {count(pair.cells?.b)} · pair {count(pair.cells?.pair)}
              </dd>
            </div>
            <div>
              <dt title="Genes whose change in the pair differs from the sum of the two single genes">Genes off the sum</dt>
              <dd>{count(pair.interactionGenes)}</dd>
            </div>
          </dl>
            {how}
          </div>
        </div>
        <div className={styles.pair}>
          <GeneList
            testId="interaction-above"
            title="Higher than the sum"
            hint={`Genes that are higher when ${pair.a} and ${pair.b} are on together than the two genes alone add up to.`}
            rows={pair.above || []}
            pair={pair}
          />
          <GeneList
            testId="interaction-below"
            title="Lower than the sum"
            hint={`Genes that are lower when ${pair.a} and ${pair.b} are on together than the two genes alone add up to.`}
            rows={pair.below || []}
            pair={pair}
          />
        </div>
      </div>
    );
  }

  return (
    <section className={styles.pairSection} ref={sectionRef} aria-label={`${a} + ${b}`}>
      {body}
      {answer?.status !== "found" && how}
    </section>
  );
};

export { PairPanel };
