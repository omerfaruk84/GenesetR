import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { Panel, ToolbarButton, uiStyles } from "../ui";
import { TableExportButtons } from "../export-buttons";
import { genePagePath } from "../../utils/geneLinks";
import styles from "./genelist-compare-page.module.scss";

const PAGE = 200;

/** Every gene of the selected lists with the lists that contain it. */
const MembershipTable = ({ lists, rows, colors, drugs }) => {
  const [query, setQuery] = useState("");
  const [minLists, setMinLists] = useState(1);
  const [limit, setLimit] = useState(PAGE);
  const names = lists.map((l) => l.name);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return rows.filter((r) => r.Lists >= minLists && (!q || r.Gene.includes(q)));
  }, [rows, query, minLists]);

  const exportColumns = useMemo(
    () => [
      { accessorKey: "Gene", header: "Gene" },
      { accessorKey: "Lists", header: "Number of lists" },
      ...names.map((n) => ({ accessorFn: (r) => r[n], accessorKey: n, header: n })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [names.join("\u0000")]
  );

  return (
    <Panel
      title="Membership"
      subtitle={`${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} genes`}
      data-testid="genelist-membership"
      actions={<TableExportButtons rows={() => filtered} columns={exportColumns} filename="genelist-membership" />}
      flush
    >
      <div className={styles.libraryToolbar}>
        <label className={styles.search}>
          <FaSearch size={11} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a gene" aria-label="Find a gene" />
        </label>
        <label className={styles.inlineField}>
          In at least
          <select className={styles.select} value={minLists} onChange={(e) => setMinLists(Number(e.target.value))}>
            {names.map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} list{i ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={`${uiStyles.tableScroll} ${styles.membershipScroll}`}>
        <table className={`${uiStyles.table} ${styles.membershipTable}`}>
          <thead>
            <tr>
              <th>Gene</th>
              <th className={uiStyles.num}>Lists</th>
              {names.map((n) => (
                <th key={n} className={styles.memberCol} title={n}>
                  <span className={styles.swatch} style={{ background: colors[n] }} />
                  <span className={styles.memberColName}>{n}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map((r) => (
              <tr key={r.Gene}>
                <td className={styles.geneCell}>
                  {drugs ? r.Gene : <Link to={genePagePath(r.Gene)}>{r.Gene}</Link>}
                </td>
                <td className={uiStyles.num}>{r.Lists}</td>
                {names.map((n) => (
                  <td key={n} className={styles.memberCol}>
                    {r[n] ? (
                      <span className={styles.memberDot} style={{ background: colors[n] }} aria-label={`in ${n}`} />
                    ) : (
                      <span className={styles.memberEmpty} aria-label={`not in ${n}`} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={names.length + 2} className={uiStyles.muted}>
                  No gene matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <div className={styles.tableMore}>
          <ToolbarButton size="sm" variant="ghost" onClick={() => setLimit(limit + PAGE * 5)}>
            Show more ({(filtered.length - limit).toLocaleString()} left)
          </ToolbarButton>
        </div>
      )}
    </Panel>
  );
};

export default MembershipTable;
