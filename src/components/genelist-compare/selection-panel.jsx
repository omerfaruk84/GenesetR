import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { saveAs } from "file-saver";
import { FaCopy, FaDownload, FaTimes } from "react-icons/fa";
import { Panel, ToolbarButton, uiStyles } from "../ui";
import { SendToMenu } from "../send-to";
import { GeneSetEnrichmentTable } from "../enrichment";
import { copyText } from "../../utils/apiSnippets";
import { genePagePath } from "../../utils/geneLinks";
import { isDrugList } from "../../utils/drugLabels";
import styles from "./genelist-compare-page.module.scss";

const PREVIEW = 240;

const fileSafe = (text) => String(text || "selection").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60);

/** Genes of the clicked plot region or matrix cell, with what can be done with them. */
const SelectionPanel = ({ selection, onClear }) => {
  const [showAll, setShowAll] = useState(false);
  const genes = useMemo(() => [...(selection?.genes || [])].sort(), [selection]);
  const drugs = useMemo(() => isDrugList(genes), [genes]);
  const genesets = useMemo(() => (genes.length >= 3 ? { [selection.label]: genes.join(",") } : {}), [genes, selection]);

  if (!selection) {
    return (
      <Panel title="Selected genes" data-testid="genelist-selection">
        <div className={uiStyles.muted}>
          Click a bar or column of the UpSet plot, a region of the Venn diagram or a cell of the similarity matrix to list
          its genes here, then copy, save, send them to another module or test them for enrichment.
        </div>
      </Panel>
    );
  }

  const shown = showAll ? genes : genes.slice(0, PREVIEW);
  const copy = async () => {
    const ok = await copyText(genes.join("\n"));
    toast({ message: { type: ok ? "Success" : "Error", icon: true, content: ok ? `${genes.length} genes copied` : "Copy failed" }, autoClose: 2000 });
  };
  const download = () =>
    saveAs(new Blob([genes.join("\n") + "\n"], { type: "text/plain;charset=utf-8" }), `${fileSafe(selection.label)}.txt`);

  return (
    <Panel
      title={selection.label}
      subtitle={`${genes.length.toLocaleString()} gene${genes.length === 1 ? "" : "s"}`}
      data-testid="genelist-selection"
      actions={
        <>
          <ToolbarButton size="sm" icon={<FaCopy size={11} />} onClick={copy} disabled={!genes.length}>
            Copy
          </ToolbarButton>
          <ToolbarButton size="sm" icon={<FaDownload size={11} />} onClick={download} disabled={!genes.length}>
            TXT
          </ToolbarButton>
          <SendToMenu genes={genes} defaultName={selection.label} />
          <ToolbarButton size="sm" variant="ghost" icon={<FaTimes size={11} />} onClick={onClear} aria-label="Clear selection">
            Clear
          </ToolbarButton>
        </>
      }
    >
      {genes.length === 0 ? (
        <div className={uiStyles.muted}>This combination holds no genes.</div>
      ) : (
        <>
          <div className={styles.chips}>
            {shown.map((gene) =>
              drugs ? (
                <span key={gene} className={styles.chip}>
                  {gene}
                </span>
              ) : (
                <Link key={gene} to={genePagePath(gene)} className={styles.chip} title={`Open the gene page of ${gene}`}>
                  {gene}
                </Link>
              )
            )}
            {genes.length > PREVIEW && (
              <button type="button" className={styles.chipMore} onClick={() => setShowAll(!showAll)}>
                {showAll ? "Show fewer" : `+ ${genes.length - PREVIEW} more`}
              </button>
            )}
          </div>
          {genes.length >= 3 ? (
            <div className={styles.enrichment}>
              <h4 className={styles.subheading}>Enrichment of the selected genes</h4>
              <GeneSetEnrichmentTable genesets={genesets} />
            </div>
          ) : (
            <div className={`${uiStyles.muted} ${styles.enrichmentHint}`}>Enrichment analysis needs at least 3 genes.</div>
          )}
        </>
      )}
    </Panel>
  );
};

export default SelectionPanel;
