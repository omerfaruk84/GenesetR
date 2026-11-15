import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { ToolbarButton } from "../ui";
import { listGenes } from "../../utils/geneSetOverlap";
import styles from "./genelist-compare-page.module.scss";

/**
 * Dialog to create a gene list or edit a saved one.
 *   initial  { name, genes, description } of the list being edited, or null for a new list
 *   onSave   async ({ name, genes, description, previousName }) => void; throws to show an error
 */
const ListEditor = ({ open, initial = null, existingNames = [], onSave, onClose }) => {
  const [name, setName] = useState("");
  const [genes, setGenes] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setGenes(initial ? listGenes(initial.genes).join("\n") : "");
    setDescription(initial?.description || "");
    setError("");
    setSaving(false);
  }, [open, initial]);

  const parsed = useMemo(() => listGenes(genes), [genes]);
  const trimmed = name.trim();
  const clash = trimmed && trimmed !== initial?.name && existingNames.includes(trimmed);
  const nameProblem = trimmed.length > 0 && trimmed.length < 3 ? "At least 3 characters" : clash ? "A list with this name exists and will be replaced" : "";
  const canSave = trimmed.length >= 3 && parsed.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ name: trimmed, genes: parsed, description: description.trim(), previousName: initial?.name || null });
      onClose();
    } catch (e) {
      setError(e?.message || "The list could not be saved");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? `Edit “${initial.name}”` : "New gene list"}</DialogTitle>
      <DialogContent>
        <div className={styles.editorFields}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            autoFocus
            helperText={nameProblem || " "}
            error={!!nameProblem && !clash}
            inputProps={{ maxLength: 120, "data-testid": "list-editor-name" }}
          />
          <TextField
            label="Genes"
            value={genes}
            onChange={(e) => setGenes(e.target.value)}
            multiline
            minRows={8}
            maxRows={16}
            fullWidth
            placeholder={"One gene per line, or separated by commas, spaces or semicolons\nATF4\nDDIT3\nXBP1"}
            helperText={`${parsed.length} unique gene${parsed.length === 1 ? "" : "s"}; symbols are upper-cased and duplicates removed`}
            inputProps={{ spellCheck: false, "data-testid": "list-editor-genes", style: { fontFamily: "var(--gs-mono, monospace)", fontSize: 13 } }}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            fullWidth
            placeholder="Source, cut-off, dataset…"
            inputProps={{ maxLength: 500 }}
          />
          {error && <div className={styles.editorError}>{error}</div>}
        </div>
      </DialogContent>
      <DialogActions>
        <ToolbarButton variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </ToolbarButton>
        <ToolbarButton variant="primary" onClick={save} disabled={!canSave} data-testid="list-editor-save">
          {saving ? "Saving…" : initial ? "Save changes" : "Save list"}
        </ToolbarButton>
      </DialogActions>
    </Dialog>
  );
};

export default ListEditor;
