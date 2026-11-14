import React, { useMemo, useState } from "react";
import { useSelector, useStore } from "react-redux";
import { Dialog, DialogContent, DialogTitle, Menu, MenuItem } from "@mui/material";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaShareAlt } from "react-icons/fa";
import { ROUTES } from "../../common/routes";
import { getLastRequest } from "../../store/api";
import { createPermalink, permalinkUrl } from "../../store/api/permalinks";
import { ModulePathNames } from "../../store/results/enums";
import { hasUrlState, takeSnapshot } from "../../store/urlState";
import { copyText, curlSnippet, methodsText, pythonSnippet } from "../../utils/apiSnippets";
import { TabNames } from "../top-bar/enums";
import styles from "./share-menu.module.scss";

const ROUTE_LABELS = {
  [ROUTES.CORRELATION]: TabNames.CORRELATION,
  [ROUTES.DR]: "Dimensionality reduction and clustering",
  [ROUTES.HEATMAP]: "Heatmap",
  [ROUTES.PATHFINDER]: TabNames.PATHFINDER,
  [ROUTES.GENESIGNATURE]: TabNames.GENESIGNATURE,
  [ROUTES.DEREGULATED_GENES]: TabNames.DEREGULATED_GENES,
  [ROUTES.EXPRESSIONANALYZER]: TabNames.EXPRESSIONANALYZER,
  [ROUTES.MULTIDATASET_COMPARISON]: TabNames.MULTIDATASET_COMPARISON,
  [ROUTES.GENE_REGULATION]: "Gene regulation",
  [ROUTES.GENE_REGULATION_ENHANCED]: "Gene regulation (enhanced)",
  [ROUTES.CELL_CYCLE]: TabNames.CELL_CYCLE,
};

const notify = (ok, content, details) =>
  toast({ message: { type: ok ? "Success" : "Error", icon: true, content, details } });

/**
 * "Share" button of an analysis page: a link that restores the page with all
 * its settings, the request as curl / Python, and a methods & citation text.
 */
const ShareMenu = ({ pathname }) => {
  const store = useStore();
  const core = useSelector((state) => state.settings?.core) || {};
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState(null);

  const moduleName = pathname === ROUTES.DR ? ModulePathNames[`/${core.currentModule}`] : ModulePathNames[pathname];
  // Looked up when the menu opens, so it reflects the latest run
  const lastRequest = useMemo(() => (anchor ? getLastRequest(moduleName) : null), [anchor, moduleName]);

  if (!hasUrlState(pathname)) return null;

  const close = () => setAnchor(null);

  const makeLink = async () => {
    const snapshot = takeSnapshot(store.getState().settings, pathname, { full: true });
    const id = await createPermalink(pathname, snapshot);
    return permalinkUrl(id);
  };

  const copyLink = async () => {
    close();
    setBusy(true);
    try {
      const url = await makeLink();
      const ok = await copyText(url);
      notify(ok, ok ? "Link copied" : "The link could not be copied", ok ? "Anyone with the link sees this analysis with the same settings." : url);
    } catch (error) {
      notify(false, "The link could not be created", error.message);
    } finally {
      setBusy(false);
    }
  };

  const copySnippet = async (build, label) => {
    close();
    const ok = await copyText(build(lastRequest));
    notify(ok, ok ? `${label} copied` : `${label} could not be copied`);
  };

  const openMethods = async () => {
    close();
    const state = store.getState().settings;
    const request = getLastRequest(moduleName);
    const all = state.core?.datasetList || [];
    // Datasets named in the request, or the selected one before anything ran
    const ids = request
      ? [].concat(request.datasets || [], request.cell_line || []).filter(Boolean)
      : [state.core?.cellLine?.id].filter(Boolean);
    const datasets = [...new Set(ids)].map(
      (id) => all.find((d) => String(d.id).toLowerCase() === String(id).toLowerCase()) || { id, name: id }
    );
    const parameters = request
      ? Object.fromEntries(Object.entries(request).filter(([key]) => !["request", "retType", "cell_line", "datasets"].includes(key)))
      : takeSnapshot(state, pathname).slices;
    let link = null;
    try {
      link = await makeLink();
    } catch (error) {
      link = null; // the text is still useful without the link
    }
    setMethods(methodsText({ analysis: ROUTE_LABELS[pathname] || "GeneSetR", datasets, parameters, link }));
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        data-tour="share"
        disabled={busy}
        onClick={(event) => setAnchor(event.currentTarget)}
        title="Share or reproduce this analysis"
      >
        <FaShareAlt aria-hidden="true" /> {busy ? "Creating link…" : "Share / reproduce"}
      </button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem onClick={copyLink}>Copy link to this analysis</MenuItem>
        <MenuItem disabled={!lastRequest} onClick={() => copySnippet(pythonSnippet, "Python script")}>
          Copy as Python script
        </MenuItem>
        <MenuItem disabled={!lastRequest} onClick={() => copySnippet(curlSnippet, "curl command")}>
          Copy as curl command
        </MenuItem>
        <MenuItem onClick={openMethods}>Methods &amp; citation…</MenuItem>
        {!lastRequest && (
          <div className={styles.hint}>Run the analysis once to copy it as a script.</div>
        )}
      </Menu>

      <Dialog open={methods !== null} onClose={() => setMethods(null)} maxWidth="md" fullWidth>
        <DialogTitle>Methods &amp; citation</DialogTitle>
        <DialogContent>
          <pre className={styles.methods}>{methods}</pre>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={async () => {
                const ok = await copyText(methods || "");
                notify(ok, ok ? "Text copied" : "The text could not be copied");
              }}
            >
              Copy text
            </button>
            <button type="button" className={styles.secondary} onClick={() => setMethods(null)}>
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { ShareMenu };
