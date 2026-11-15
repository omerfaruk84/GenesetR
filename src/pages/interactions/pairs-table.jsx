import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isPair, sortPairs } from "../../utils/interactions";
import { ClassName, count, fmt } from "./parts";
import styles from "./interactions-page.module.scss";

const COLUMNS = [
  { key: "label", label: "Pair", title: "The two genes that were switched on together" },
  { key: "class", label: "Class", title: "What the pair does compared with the sum of the two genes alone" },
  { key: "coefficientA", label: "Weight 1", numeric: true, title: "Weight of the first gene when the pair's response is written as a mix of the two single responses" },
  { key: "coefficientB", label: "Weight 2", numeric: true, title: "Weight of the second gene" },
  { key: "fit", label: "Fit", numeric: true, title: "Share of the pair's response that the mix of the two single responses explains" },
  { key: "magnitude", label: "Magnitude", numeric: true, title: "Size of the pair's response divided by the size of the sum of the two single responses" },
  { key: "similarity", label: "Similarity", numeric: true, title: "Correlation of the responses to the two genes alone" },
  { key: "interactionGenes", label: "Off the sum", numeric: true, title: "Genes whose change in the pair differs from the sum of the two single genes (FDR 5 %)" },
  { key: "cells", label: "Cells", numeric: true, title: "Cells that carry both guides" },
];

/**
 * The pairs of a dataset as a table. A click on a column name sorts by it
 * (again: the other way round); a click on a row chooses the pair.
 *   rows        the pairs that pass the filter
 *   to          (changes) => address
 *   onRows      (sorted rows) => void, for the export of the table as shown
 */
const PairsTable = ({ rows, labels, chosen, to, onChoose, sortRef }) => {
  const [sort, setSort] = useState({ key: "interactionGenes", descending: true });
  const sorted = useMemo(() => sortPairs(rows, sort.key, sort.descending), [rows, sort]);
  if (sortRef) sortRef.current = sorted;

  const sortBy = (column) =>
    setSort((current) => (current.key === column.key ? { key: column.key, descending: !current.descending } : { key: column.key, descending: !!column.numeric }));

  return (
    <div className={styles.pairsScroll} data-testid="interaction-pairs">
      <table className={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  className={column.numeric ? styles.num : undefined}
                  aria-sort={active ? (sort.descending ? "descending" : "ascending") : "none"}
                >
                  <button type="button" className={styles.sortButton} title={`${column.title}. Click to sort`} onClick={() => sortBy(column)}>
                    {column.label}
                    {active && (
                      <span className={styles.sortArrow} aria-hidden="true">
                        {sort.descending ? "▼" : "▲"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pair) => {
            const selected = isPair(pair, chosen.a, chosen.b);
            return (
              <tr
                key={pair.label}
                className={selected ? styles.rowSelected : styles.rowClickable}
                aria-selected={selected}
                onClick={() => onChoose(pair)}
              >
                <td>
                  <Link
                    className={styles.geneLink}
                    to={to({ a: pair.a, b: pair.b })}
                    title={`Open ${pair.a} + ${pair.b}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {pair.a} + {pair.b}
                  </Link>
                </td>
                <td>
                  <ClassName id={pair.class} labels={labels} />
                </td>
                <td className={styles.num}>{fmt(pair.coefficients?.a)}</td>
                <td className={styles.num}>{fmt(pair.coefficients?.b)}</td>
                <td className={styles.num}>{fmt(pair.fit)}</td>
                <td className={styles.num}>{fmt(pair.magnitude)}</td>
                <td className={styles.num}>{fmt(pair.similarity)}</td>
                <td className={styles.num}>{count(pair.interactionGenes)}</td>
                <td className={styles.num} title={`${pair.a} alone: ${count(pair.cells?.a)} cells; ${pair.b} alone: ${count(pair.cells?.b)} cells`}>
                  {count(pair.cells?.pair)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export { PairsTable };
