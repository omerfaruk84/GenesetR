import React, { useMemo, useRef, useState } from "react";
import { FaEdit, FaFileImport, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { Panel, ToolbarButton, uiStyles } from "../ui";
import { SendToMenu } from "../send-to";
import styles from "./genelist-compare-page.module.scss";

export const MAX_COMPARED = 10;

const formatDate = (ts) => {
  if (!ts) return "–";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/**
 * The saved gene lists with a tick box each: the ticked lists are compared.
 *   lists     [{ id, name, genes: string[], description, timestamp }]
 *   selected  ids of the ticked lists, in tick order
 *   colors    { [name]: colour } of the ticked lists
 */
const ListLibrary = ({ lists, selected, colors, onToggle, onSelectAll, onClear, onNew, onEdit, onDelete, onImportFile }) => {
  const [query, setQuery] = useState("");
  const fileInput = useRef(null);
  const selectedSet = new Set(selected);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.genes.includes(q.toUpperCase())
    );
  }, [lists, query]);

  const atLimit = selected.length >= MAX_COMPARED;

  const pickFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImportFile(file);
  };

  return (
    <Panel
      title="Gene lists"
      subtitle={`${lists.length} saved · ${selected.length} selected`}
      data-testid="genelist-library"
      actions={
        <>
          <ToolbarButton size="sm" variant="primary" icon={<FaPlus size={10} />} onClick={onNew} data-testid="genelist-new">
            New list
          </ToolbarButton>
          <ToolbarButton
            size="sm"
            icon={<FaFileImport size={11} />}
            onClick={() => fileInput.current?.click()}
            title="Import .txt / .csv (one list), .gmt (one list per line) or a GeneSetR workspace .json"
          >
            Import
          </ToolbarButton>
          <input ref={fileInput} type="file" accept=".txt,.csv,.tsv,.gmt,.json" hidden onChange={pickFile} />
        </>
      }
      flush
    >
      {lists.length === 0 ? (
        <div className={styles.libraryEmpty}>
          <p>
            No saved gene lists yet. Create one here, import a file, or use <strong>Send to… → Save to my gene lists</strong>{" "}
            from any result table in GeneSetR.
          </p>
          <ToolbarButton variant="primary" icon={<FaPlus size={10} />} onClick={onNew}>
            Create your first list
          </ToolbarButton>
        </div>
      ) : (
        <>
          <div className={styles.libraryToolbar}>
            <label className={styles.search}>
              <FaSearch size={11} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, description or gene"
                aria-label="Filter gene lists"
              />
            </label>
            <span className={styles.spacer} />
            <ToolbarButton size="sm" variant="ghost" onClick={onSelectAll} disabled={lists.length === 0}>
              Select {lists.length > MAX_COMPARED ? `first ${MAX_COMPARED}` : "all"}
            </ToolbarButton>
            <ToolbarButton size="sm" variant="ghost" onClick={onClear} disabled={selected.length === 0}>
              Clear
            </ToolbarButton>
          </div>
          <div className={`${uiStyles.tableScroll} ${styles.libraryScroll}`}>
            <table className={`${uiStyles.table} ${styles.libraryTable}`}>
              <thead>
                <tr>
                  <th className={styles.colCheck} aria-label="Compare" />
                  <th>List</th>
                  <th className={uiStyles.num}>Genes</th>
                  <th className={styles.colDate}>Saved</th>
                  <th className={styles.colActions} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map((list) => {
                  const checked = selectedSet.has(list.id);
                  const disabled = !checked && atLimit;
                  return (
                    <tr key={list.id} className={checked ? styles.rowSelected : undefined}>
                      <td className={styles.colCheck}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => onToggle(list.id)}
                          aria-label={`Compare ${list.name}`}
                          title={disabled ? `At most ${MAX_COMPARED} lists can be compared at once` : undefined}
                        />
                      </td>
                      <td>
                        <button type="button" className={styles.listName} onClick={() => !disabled && onToggle(list.id)}>
                          <span
                            className={styles.swatch}
                            style={{ background: checked ? colors[list.name] : "transparent" }}
                            aria-hidden="true"
                          />
                          <span className={styles.listNameText}>{list.name}</span>
                        </button>
                        {list.description && <div className={styles.listDescription}>{list.description}</div>}
                      </td>
                      <td className={uiStyles.num}>{list.genes.length.toLocaleString()}</td>
                      <td className={styles.colDate}>{formatDate(list.timestamp)}</td>
                      <td className={styles.colActions}>
                        <span className={styles.rowActions}>
                          <SendToMenu genes={list.genes} defaultName={list.name} label="Send" />
                          <ToolbarButton size="sm" variant="ghost" onClick={() => onEdit(list)} title="Edit" aria-label={`Edit ${list.name}`}>
                            <FaEdit size={12} />
                          </ToolbarButton>
                          <ToolbarButton
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(list)}
                            title="Delete"
                            aria-label={`Delete ${list.name}`}
                            className={styles.dangerButton}
                          >
                            <FaTrash size={11} />
                          </ToolbarButton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={5} className={uiStyles.muted}>
                      No list matches “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
};

export default ListLibrary;
