import React, { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaFolderOpen, FaTimes, FaTrash } from "react-icons/fa";
import { SendToMenu } from "../send-to";
import {
  deleteGeneList,
  exportWorkspace,
  importWorkspace,
  listGeneLists,
  useWorkspaceVersion,
} from "../../utils/workspace";
import styles from "./workspace-panel.module.scss";

const notify = (type, content, details) => toast({ message: { type, icon: true, content, details }, autoClose: 3000 });

/**
 * Workspace: the saved gene lists, reachable from every page. Each list can be
 * sent to a module; the whole workspace can be exported to and imported from a
 * JSON file (the lists only exist in this browser otherwise).
 */
const WorkspacePanel = () => {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState([]);
  const version = useWorkspaceVersion();
  const fileInput = useRef(null);

  useEffect(() => {
    let cancelled = false;
    listGeneLists()
      .then((rows) => !cancelled && setLists(rows))
      .catch(() => !cancelled && setLists([]));
    return () => {
      cancelled = true;
    };
    // `open` re-reads lists saved by the older gene list boxes
  }, [version, open]);

  const remove = async (list) => {
    if (!window.confirm(`Delete the gene list "${list.name}"? This cannot be undone.`)) return;
    try {
      await deleteGeneList(list.id);
    } catch (error) {
      notify("Error", "The list could not be deleted", error.message);
    }
  };

  const download = async () => {
    const json = await exportWorkspace();
    saveAs(new Blob([json], { type: "application/json" }), `genesetr-workspace-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const count = await importWorkspace(await file.text());
      notify("Success", `${count} gene list${count === 1 ? "" : "s"} imported`);
    } catch (error) {
      notify("Error", "The file could not be imported", error.message);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Your saved gene lists"
      >
        <FaFolderOpen size={15} aria-hidden="true" />
        <span className={styles.triggerLabel}>Workspace</span>
        {lists.length > 0 && <span className={styles.count}>{lists.length}</span>}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <aside
            className={styles.panel}
            role="dialog"
            aria-label="Workspace"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.header}>
              <h2>Workspace</h2>
              <button type="button" className={styles.close} aria-label="Close the workspace" onClick={() => setOpen(false)}>
                <FaTimes />
              </button>
            </header>
            <p className={styles.note}>
              Gene lists you saved. They are stored in this browser only: export them to keep a copy or to move them
              to another computer.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.action} onClick={download} disabled={lists.length === 0}>
                Export as JSON
              </button>
              <button type="button" className={styles.action} onClick={() => fileInput.current?.click()}>
                Import…
              </button>
              <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={upload} />
            </div>

            {lists.length === 0 ? (
              <div className={styles.empty}>
                No saved gene lists yet. Use “Send to… → Save to my gene lists” on any gene list, cluster or selection.
              </div>
            ) : (
              <ul className={styles.lists}>
                {lists.map((list) => (
                  <li key={list.id} className={styles.list}>
                    <div className={styles.listHead}>
                      <span className={styles.listName} title={list.name}>
                        {list.name}
                      </span>
                      <span className={styles.listCount}>{list.count} genes</span>
                    </div>
                    {list.description && <div className={styles.listDescription}>{list.description}</div>}
                    <div className={styles.listActions}>
                      <SendToMenu genes={list.genes} defaultName={list.name} />
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Delete ${list.name}`}
                        title="Delete this list"
                        onClick={() => remove(list)}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </>
  );
};

export { WorkspacePanel };
