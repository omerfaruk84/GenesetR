import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TableExportButtons } from "../../components/export-buttons";
import { SendToMenu } from "../../components/send-to";
import { fetchAtlasModule } from "../../store/api/atlas";
import {
  AXIS_TEXT,
  MEMBER_EXPORT_COLUMNS,
  TERM_EXPORT_COLUMNS,
  consequenceExportColumns,
  consequenceExportRows,
  consequenceName,
  libraryName,
  memberRows,
  percent,
} from "../../utils/atlas";
import { genePagePath } from "../../utils/geneLinks";
import { formatQ, shortSetName } from "../../utils/integrated";
import { MemberMark, Score, plural } from "./parts";
import styles from "./atlas-page.module.scss";

const MEMBERS_SHOWN = 60;

const memberClass = (row) =>
  [styles.member, row.noAnnotation ? styles.memberNoGo : "", row.uncharacterised ? styles.memberPlaceholder : ""].filter(Boolean).join(" ");

const memberTitle = (row) =>
  [
    row.annotations === null ? "" : row.annotations === 0 ? "no GO term" : plural(row.annotations, "GO term"),
    row.uncharacterised ? "placeholder name" : "",
  ]
    .filter(Boolean)
    .join("; ");

/** One of the two consequence tables of a module. */
const Consequence = ({ testId, title, rows, nameHeader, agreeTitle, memberTitle: memberText }) => (
  <div data-testid={testId}>
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{title}</th>
            <th className={styles.num} title="Mean z-score over the members that have a value">
              Mean z
            </th>
            <th className={styles.num} title={agreeTitle}>
              Agree
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className={styles.muted}>
                None
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const name = consequenceName(row);
            return (
              <tr key={name}>
                <td>
                  <Link className={styles.geneLink} to={genePagePath(name)} title={`Open the gene page of ${name} (${nameHeader.toLowerCase()})`}>
                    {name}
                  </Link>
                  {row.member && <MemberMark title={memberText} />}
                </td>
                <td className={styles.num}>
                  <Score value={row.meanZ} limit={10} />
                </td>
                <td className={styles.num}>{percent(row.agree)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * One module of a map: its name, the gene sets it is enriched for, its
 * members (marked when they have no GO term or a placeholder name) and its
 * consequence, i.e. what changes when the members of a knock-down module are
 * lost, or which knock-downs raise or lower a co-regulation programme.
 *
 *   geneTo     (symbol) => address a member opens
 *   mapTo      address that shows the module on the map (optional)
 *   closeTo    address without the module (optional)
 */
const ModulePanel = ({ axis, id, geneTo, mapTo, closeTo }) => {
  const [answer, setAnswer] = useState(null);
  const [allMembers, setAllMembers] = useState(false);

  useEffect(() => {
    setAnswer(null);
    setAllMembers(false);
    const controller = new AbortController();
    fetchAtlasModule(axis, id, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setAnswer(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [axis, id]);

  const words = AXIS_TEXT[axis];
  if (!answer) {
    return (
      <div className={styles.card} role="status">
        Reading the {words.module}…
      </div>
    );
  }
  if (answer.status !== "found") {
    return (
      <div className={styles.card} role="alert">
        {answer.status === "error" ? answer.message : `The ${words.map.toLowerCase()} has no ${words.module} ${id}.`}
      </div>
    );
  }

  const module = answer.data;
  const members = memberRows(module);
  const shown = allMembers ? members : members.slice(0, MEMBERS_SHOWN);
  const noGo = members.filter((row) => row.noAnnotation).length;
  const placeholders = members.filter((row) => row.uncharacterised).length;
  const terms = module.terms || [];
  const up = module.consequence?.up || [];
  const down = module.consequence?.down || [];
  const isPert = axis === "pert";
  const nameHeader = isPert ? "Measured gene" : "Perturbed gene";
  const file = `genesetr-atlas-${axis === "pert" ? "module" : "programme"}-${module.id}`;

  return (
    <div className={styles.card} data-testid="atlas-module-panel">
      <div className={styles.cardHead}>
        <div>
          <h3>{module.name}</h3>
          <div className={styles.muted}>
            {plural(module.size, "gene")} · {percent(module.density)} of the possible links between them exist
            {module.named ? "" : ` · no enriched gene set: named after its most central members`}
          </div>
        </div>
        <div className={styles.headActions}>
          {mapTo && (
            <Link className={styles.action} to={mapTo}>
              Show on the map
            </Link>
          )}
          <SendToMenu genes={module.members} label="Send the genes to…" defaultName={`Atlas: ${module.name}`} drugs={false} />
          {closeTo && (
            <Link className={styles.action} to={closeTo} aria-label={`Close the ${words.module}`}>
              Close
            </Link>
          )}
        </div>
      </div>

      <div className={styles.cardHead}>
        <h4 style={{ margin: 0 }}>Enriched gene sets</h4>
        {terms.length > 0 && (
          <TableExportButtons
            rows={() => terms.map((term) => ({ ...term, genes: (term.genes || []).join(";") }))}
            columns={TERM_EXPORT_COLUMNS}
            filename={`${file}-gene-sets`}
          />
        )}
      </div>
      {terms.length === 0 ? (
        <div className={styles.muted}>None of the gene sets (CORUM, Reactome, GO, Hallmark) is enriched among the members.</div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table} data-testid="atlas-module-terms">
            <thead>
              <tr>
                <th>Gene set</th>
                <th>Library</th>
                <th className={styles.num} title="Members in the set, of the genes in the set">
                  Overlap
                </th>
                <th className={styles.num}>q</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={`${term.library}|${term.set}`} title={`${term.set}: ${(term.genes || []).join(", ")}`}>
                  <td className={styles.wrap}>{shortSetName(term.set)}</td>
                  <td>{libraryName(term.library)}</td>
                  <td className={styles.num}>
                    {term.overlap} of {term.setSize}
                  </td>
                  <td className={styles.num}>{formatQ(term.q)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <div>
          <h4 style={{ margin: 0 }}>Members, most central first</h4>
          <div className={styles.muted}>
            {noGo} without a GO term, {placeholders} with a placeholder name
          </div>
        </div>
        <TableExportButtons
          rows={() => members.map((row) => ({ ...row, annotations: row.annotations ?? "", uncharacterised: row.uncharacterised ? "yes" : "no" }))}
          columns={MEMBER_EXPORT_COLUMNS}
          filename={`${file}-members`}
        />
      </div>
      <div className={styles.members} data-testid="atlas-module-members">
        {shown.map((row) => (
          <Link
            key={row.gene}
            className={memberClass(row)}
            to={geneTo(row.gene)}
            title={memberTitle(row)}
            data-no-go={row.noAnnotation ? "true" : undefined}
            data-placeholder={row.uncharacterised ? "true" : undefined}
          >
            {row.gene}
          </Link>
        ))}
        {members.length > MEMBERS_SHOWN && (
          <button type="button" className={styles.linkButton} onClick={() => setAllMembers((value) => !value)}>
            {allMembers ? "Show fewer" : `Show all ${members.length}`}
          </button>
        )}
      </div>
      <div className={styles.legend}>
        <span>
          <span className={`${styles.member} ${styles.memberNoGo}`}>GENE</span> no GO term
        </span>
        <span>
          <span className={`${styles.member} ${styles.memberPlaceholder}`}>GENE</span> placeholder name (open reading
          frame, FAM, KIAA)
        </span>
      </div>

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <div>
          <h4 style={{ margin: 0 }}>{isPert ? "What changes when the members are knocked down" : "Knock-downs that move the programme"}</h4>
          <div className={styles.muted}>
            {isPert
              ? "Measured genes, averaged over the knock-downs of the members."
              : "Perturbed genes, averaged over the genes of the programme."}{" "}
            “Agree” is the share of the members that change in this direction on their own (|z| ≥ 2).
          </div>
        </div>
        {up.length + down.length > 0 && (
          <div className={styles.headActions}>
            <SendToMenu
              genes={[...up, ...down].map(consequenceName)}
              label={isPert ? "Send these genes to…" : "Send the perturbed genes to…"}
              defaultName={`Atlas: consequence of ${module.name}`}
              drugs={false}
            />
            <TableExportButtons
              rows={() => consequenceExportRows(module.consequence)}
              columns={consequenceExportColumns(nameHeader)}
              filename={`${file}-consequence`}
            />
          </div>
        )}
      </div>
      <div className={styles.split}>
        <Consequence
          testId="atlas-module-up"
          title={isPert ? "Go up" : "Knock-down raises it"}
          rows={up}
          nameHeader={nameHeader}
          agreeTitle="Share of the members that agree, of those with a value"
          memberTitle={isPert ? "This gene is itself a member of the module" : "This gene is itself in the programme"}
        />
        <Consequence
          testId="atlas-module-down"
          title={isPert ? "Go down" : "Knock-down lowers it"}
          rows={down}
          nameHeader={nameHeader}
          agreeTitle="Share of the members that agree, of those with a value"
          memberTitle={isPert ? "This gene is itself a member of the module" : "This gene is itself in the programme"}
        />
      </div>
    </div>
  );
};

export { ModulePanel };
