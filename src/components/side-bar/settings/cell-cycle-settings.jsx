import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Field, CheckBox, Input } from "@oliasoft-open-source/react-ui-library";
import styles from "./settings.module.scss";
import { fetchCellCycleCellLinesV2 } from "../../../store/api/v2";
import { cellCycleSettingsChanged } from "../../../store/settings/cell-cycle-settings";
import { CellCycleSettingsTypes } from "./enums";

const CellCycleSettings = ({ cellCycleSettings, cellCycleSettingsChanged }) => {
  const [availableCellLines, setAvailableCellLines] = useState([]);
  const [filterText, setFilterText] = useState("");

  const selectedCellLines = cellCycleSettings?.selectedCellLines || [];
  const minCellLines = cellCycleSettings?.minCellLines ?? 1;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cls = await fetchCellCycleCellLinesV2();
      if (cancelled) return;
      setAvailableCellLines(cls || []);

      if ((cls || []).length && selectedCellLines.length === 0) {
        cellCycleSettingsChanged({
          settingName: CellCycleSettingsTypes.SELECTED_CELL_LINES,
          newValue: [cls[0]],
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const selectedCount = selectedCellLines.length;
    const parsed = parseInt(String(minCellLines), 10);
    const normalized = Number.isFinite(parsed) ? parsed : 1;

    if (selectedCount > 0 && normalized > selectedCount) {
      cellCycleSettingsChanged({
        settingName: CellCycleSettingsTypes.MIN_CELL_LINES,
        newValue: selectedCount,
      });
    } else if (normalized < 1) {
      cellCycleSettingsChanged({
        settingName: CellCycleSettingsTypes.MIN_CELL_LINES,
        newValue: 1,
      });
    }
  }, [selectedCellLines.length, minCellLines, cellCycleSettingsChanged]);

  const visibleCellLines = useMemo(() => {
    const q = (filterText || "").trim().toLowerCase();
    if (!q) return availableCellLines;
    return (availableCellLines || []).filter((cl) => String(cl || "").toLowerCase().includes(q));
  }, [availableCellLines, filterText]);

  const updateSelected = (next) => {
    cellCycleSettingsChanged({
      settingName: CellCycleSettingsTypes.SELECTED_CELL_LINES,
      newValue: next,
    });
  };

  const toggleCellLine = (cellLine, checked) => {
    const current = selectedCellLines || [];
    const next = checked ? Array.from(new Set([...current, cellLine])) : current.filter((x) => x !== cellLine);
    updateSelected(next);
  };

  return (
    <>
      <Field label="Cell lines" helpText="Select one or more cell lines to include in the cross-cell-line delta table.">
        <Input
          placeholder="Filter cell lines…"
          value={filterText}
          onChange={({ target: { value } }) => setFilterText(value)}
        />
        <div className={styles.scrollArea} style={{ maxHeight: 220, overflow: "auto", marginTop: 8 }}>
          {visibleCellLines.map((cl) => (
            <div key={cl} style={{ padding: "4px 0" }}>
              <CheckBox
                label={cl}
                checked={selectedCellLines.includes(cl)}
                onChange={({ target: { checked } }) => toggleCellLine(cl, checked)}
              />
            </div>
          ))}
          {visibleCellLines.length === 0 && (
            <div style={{ fontSize: 12, color: "#666", padding: "6px 0" }}>No matches</div>
          )}
        </div>
      </Field>

      <Field
        label="Min cells per gene"
        labelLeft
        labelWidth="150px"
        helpText="Genes with fewer cells than this threshold (per cell line) will be omitted."
      >
        <Input
          type="number"
          min={0}
          value={cellCycleSettings?.minCells ?? 0}
          onChange={({ target: { value } }) =>
            cellCycleSettingsChanged({
              settingName: CellCycleSettingsTypes.MIN_CELLS,
              newValue: parseInt(value || "0", 10),
            })
          }
        />
      </Field>

      <Field
        label="Min cell lines with data"
        labelLeft
        labelWidth="150px"
        helpText="Only show genes present in at least this many of the selected cell lines."
      >
        <Input
          type="number"
          min={1}
          max={Math.max(1, selectedCellLines.length)}
          value={cellCycleSettings?.minCellLines ?? 1}
          onChange={({ target: { value } }) =>
            cellCycleSettingsChanged({
              settingName: CellCycleSettingsTypes.MIN_CELL_LINES,
              newValue: parseInt(value || "1", 10),
            })
          }
        />
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  cellCycleSettings: settings?.cellCycle ?? {},
});

const mapDispatchToProps = {
  cellCycleSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CellCycleSettings);
export { MainContainer as CellCycleSettings };
