import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { extractCombinations } from "@upsetjs/react";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { genelistcompareSettingsChanged } from "../../store/settings/genelist-compare-settings";
import { withErrorBoundary } from "../error-boundary";
import { EmptyState, ModuleIntro } from "../ui";
import { PALETTES } from "../../utils/palette";
import { usePalette } from "../../utils/theme";
import { isDrugList } from "../../utils/drugLabels";
import { deleteGeneList, importWorkspace, listGeneLists, saveGeneList, useWorkspaceVersion } from "../../utils/workspace";
import {
  DEFAULT_BACKGROUND,
  buildMembership,
  describeCombination,
  listGenes,
  membershipRows,
  pairwiseOverlaps,
} from "../../utils/geneSetOverlap";
import ListLibrary, { MAX_COMPARED } from "./list-library";
import ListEditor from "./list-editor";
import OverlapPlots, { COMBINATION_TYPES } from "./overlap-plots";
import SimilarityMatrix from "./similarity-matrix";
import SelectionPanel from "./selection-panel";
import MembershipTable from "./membership-table";
import styles from "./genelist-compare-page.module.scss";

const INTRO = {
  title: "Compare gene lists",
  description:
    "Keep the gene lists you collect across GeneSetR in one place and compare them: see which genes they share, how similar they are and whether an overlap is larger than expected by chance. Lists are stored in this browser; export the workspace (top bar) to keep or move them.",
  features: [
    "UpSet plot for any number of lists, Venn diagram for 2–5",
    "Pairwise Jaccard index, overlap coefficient and hypergeometric enrichment (BH-adjusted)",
    "Click any intersection, region or matrix cell to list, copy, save or send its genes and test them for enrichment",
    "Gene × list membership table and every result exportable as CSV, TSV, Excel, SVG or PNG",
    "Import plain text, CSV or GMT files; create, edit and delete lists in place",
  ],
};

const notify = (type, content, details) => toast({ message: { type, icon: true, content, details }, autoClose: 3000 });

const baseName = (fileName) => String(fileName || "Imported list").replace(/\.[^.]+$/, "").trim() || "Imported list";

const uniqueName = (name, taken) => {
  let candidate = name.length >= 3 ? name : `${name} list`;
  let n = 2;
  while (taken.has(candidate)) candidate = `${name} (${n++})`;
  return candidate;
};

const GenelistCompare = ({ settings, settingChanged }) => {
  const version = useWorkspaceVersion();
  const [library, setLibrary] = useState(null); // null while loading
  const [editor, setEditor] = useState({ open: false, list: null });
  const [hovered, setHovered] = useState(null);
  const [selection, setSelection] = useState(null); // { label, genes, key, highlight }
  const [introOpen, setIntroOpen] = useState(undefined);

  const set = useCallback((settingName, newValue) => settingChanged({ settingName, newValue }), [settingChanged]);
  const storedIds = Array.isArray(settings.selectedlists) ? settings.selectedlists : null;
  // Selected ids that still exist (the setting may hold lists deleted elsewhere)
  const selectedIds = useMemo(() => {
    if (!storedIds) return [];
    if (!library) return storedIds;
    const ids = new Set(library.map((l) => l.id));
    return storedIds.filter((id) => ids.has(id));
  }, [storedIds, library]);

  // ---------------------------------------------------------------- data --
  const reload = useCallback(async () => {
    try {
      const rows = (await listGeneLists())
        .map((row) => ({ ...row, genes: listGenes(row.genes) }))
        .filter((row) => row.genes.length > 0);
      // Keep the same array when nothing changed, so a re-read does not reset the page
      setLibrary((prev) => (prev && JSON.stringify(prev) === JSON.stringify(rows) ? prev : rows));
    } catch (error) {
      setLibrary([]);
      notify("Error", "Your saved gene lists could not be read", error.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, version]);

  // Lists saved by the older gene list boxes do not announce themselves: re-read when the tab regains focus
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  // Pick the two newest lists the first time. Ids of deleted lists are not
  // pruned from the setting here (a redux update can render before a newer
  // library state and would drop a list just saved); they are ignored below.
  useEffect(() => {
    if (library && !Array.isArray(settings.selectedlists) && library.length >= 2) {
      set("selectedlists", library.slice(0, 2).map((l) => l.id));
    }
  }, [library, settings.selectedlists, set]);

  // --------------------------------------------------------------- plots --
  const pagePalette = usePalette();
  const themeSetting = settings.theme || "Colorful";
  const isVega = themeSetting === "Vega";
  const plotPalette = themeSetting === "Dark" ? PALETTES.dark : isVega ? PALETTES.light : pagePalette;
  const plot = {
    theme: isVega ? "vega" : plotPalette.mode,
    colorful: themeSetting === "Colorful",
    background: isVega ? "#ffffff" : plotPalette.bg,
    colors: isVega
      ? {}
      : {
          color: plotPalette.mode === "dark" ? "#aab3c0" : "#4a5462",
          textColor: plotPalette.text,
          selectionColor: plotPalette.accent,
          hoverHintColor: plotPalette.borderStrong,
          notMemberColor: plotPalette.border,
          alternatingBackgroundColor: plotPalette.surfaceAlt,
        },
  };
  const series = pagePalette.series;

  const compared = useMemo(() => {
    if (!library) return [];
    const byId = new Map(library.map((l) => [l.id, l]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [library, selectedIds]);

  const colors = useMemo(() => {
    const out = {};
    compared.forEach((list, index) => {
      out[list.name] = series[index % series.length];
    });
    return out;
  }, [compared, series]);

  const elems = useMemo(() => buildMembership(compared), [compared]);
  const mode = Number.isInteger(settings.mode) ? settings.mode : 3;

  const { sets, combinations } = useMemo(() => {
    if (compared.length < 2) return { sets: [], combinations: [] };
    const result = extractCombinations(elems, {
      type: COMBINATION_TYPES[mode] || "distinctIntersection",
      setOrder: ["cardinality", "name"],
      combinationOrder: ["cardinality:desc", "degree:asc"],
    });
    // UpSetJS draws the last set on top: ascending order puts the largest list on top
    const ordered = [...result.sets].sort((a, b) => a.cardinality - b.cardinality || b.name.localeCompare(a.name));
    const colored = plot.colorful ? ordered.map((s) => ({ ...s, color: colors[s.name] })) : ordered;
    return { sets: colored, combinations: result.combinations || [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elems, mode, plot.colorful, colors, compared.length]);

  const background = Number(settings.background) > 0 ? Number(settings.background) : DEFAULT_BACKGROUND;
  const overlaps = useMemo(() => pairwiseOverlaps(compared, background), [compared, background]);
  const rows = useMemo(() => membershipRows(compared), [compared]);
  const drugs = useMemo(() => isDrugList(elems.slice(0, 500).map((e) => e.name)), [elems]);

  const summary = useMemo(() => {
    const n = compared.length;
    const all = rows.filter((r) => r.Lists === n).map((r) => r.Gene);
    const shared = rows.filter((r) => r.Lists >= 2).map((r) => r.Gene);
    const single = rows.filter((r) => r.Lists === 1).map((r) => r.Gene);
    const best = [...overlaps.pairs].sort((a, b) => b.jaccard - a.jaccard)[0];
    return { n, all, shared, single, best };
  }, [rows, compared.length, overlaps]);

  // The selection disappears when the lists it came from change
  const comparedKey = compared.map((l) => `${l.id}:${l.genes.length}`).join("|");
  useEffect(() => {
    setSelection(null);
    setHovered(null);
  }, [comparedKey, mode]);

  const elemsByGene = useMemo(() => new Map(elems.map((e) => [e.name, e])), [elems]);
  const highlightOf = (genes) => genes.map((g) => elemsByGene.get(g)).filter(Boolean);

  const selectCombination = (combination) => {
    const genes = (combination.elems || []).map((e) => e.name);
    setSelection({
      label: describeCombination(combination, compared.map((l) => l.name)),
      genes,
      key: `combo:${combination.name}`,
      highlight: combination,
    });
  };
  const selectGenes = (label, genes, key) => setSelection({ label, genes, key, highlight: highlightOf(genes) });

  // ------------------------------------------------------------- actions --
  const toggle = (id) => {
    if (selectedIds.includes(id)) set("selectedlists", selectedIds.filter((x) => x !== id));
    else if (selectedIds.length < MAX_COMPARED) set("selectedlists", [...selectedIds, id]);
  };

  const saveList = async ({ name, genes, description, previousName }) => {
    const id = await saveGeneList(name, genes, description);
    if (previousName && previousName !== name) await deleteGeneList(previousName);
    // Read the lists first: the selection only keeps ids the library has
    await reload();
    if (previousName && previousName !== name) {
      set("selectedlists", selectedIds.map((x) => (x === previousName ? id : x)).filter((x, i, a) => a.indexOf(x) === i));
    } else if (!previousName && !selectedIds.includes(id) && selectedIds.length < MAX_COMPARED) {
      set("selectedlists", [...selectedIds, id]);
    }
    notify("Success", previousName ? `“${name}” updated` : `“${name}” saved`, `${genes.length} genes`);
  };

  const removeList = async (list) => {
    if (!window.confirm(`Delete the gene list “${list.name}” (${list.genes.length} genes) from this browser? This cannot be undone.`)) return;
    try {
      await deleteGeneList(list.id);
      set("selectedlists", selectedIds.filter((x) => x !== list.id));
      notify("Success", `“${list.name}” deleted`);
    } catch (error) {
      notify("Error", "The list could not be deleted", error.message);
    }
  };

  const importFile = async (file) => {
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name)) {
        const count = await importWorkspace(text);
        notify("Success", `${count} gene list${count === 1 ? "" : "s"} imported`);
        return;
      }
      const taken = new Set((library || []).map((l) => l.name));
      const imported = [];
      if (/\.gmt$/i.test(file.name)) {
        for (const line of text.split(/\r?\n/)) {
          const [name, description, ...genes] = line.split("\t");
          const symbols = listGenes(genes.join("\n"));
          if (!name?.trim() || symbols.length === 0) continue;
          const unique = uniqueName(name.trim(), taken);
          taken.add(unique);
          // eslint-disable-next-line no-await-in-loop
          imported.push(await saveGeneList(unique, symbols, description && !/^https?:/.test(description) ? description : ""));
        }
      } else {
        // .txt / .csv / .tsv: one list; the first column of each line when the file has columns
        const firstColumn = text
          .split(/\r?\n/)
          .map((line) => line.split(/[\t,;]/)[0])
          .join("\n");
        const symbols = listGenes(/[\t,;]/.test(text) && text.includes("\n") ? firstColumn : text).filter(
          (g, i) => !(i === 0 && /^(GENE|SYMBOL|GENES|GENE_SYMBOL|NAME)$/.test(g))
        );
        if (symbols.length === 0) throw new Error("No gene symbols found in the file");
        const unique = uniqueName(baseName(file.name), taken);
        imported.push(await saveGeneList(unique, symbols, `Imported from ${file.name}`));
      }
      if (imported.length === 0) throw new Error("No gene lists found in the file");
      notify("Success", `${imported.length} gene list${imported.length === 1 ? "" : "s"} imported`, imported.slice(0, 5).join(", "));
    } catch (error) {
      notify("Error", "The file could not be imported", error.message);
    }
  };

  // -------------------------------------------------------------- render --
  const comparing = compared.length >= 2;
  const introExpanded = introOpen === undefined ? !library || library.length === 0 : introOpen;

  return (
    <div className={styles.page} data-testid="genelist-compare">
      <ModuleIntro
        title={INTRO.title}
        description={INTRO.description}
        features={INTRO.features}
        expanded={introExpanded}
        onChange={setIntroOpen}
      />

      <div className={styles.topGrid}>
        <ListLibrary
          lists={library || []}
          selected={selectedIds}
          colors={colors}
          onToggle={toggle}
          onSelectAll={() => set("selectedlists", (library || []).slice(0, MAX_COMPARED).map((l) => l.id))}
          onClear={() => set("selectedlists", [])}
          onNew={() => setEditor({ open: true, list: null })}
          onEdit={(list) => setEditor({ open: true, list })}
          onDelete={removeList}
          onImportFile={importFile}
        />

        {comparing && (
          <div className={styles.kpis} data-testid="genelist-summary">
            <div className={styles.kpi}>
              <span className={styles.kpiValue}>{rows.length.toLocaleString()}</span>
              <span className={styles.kpiLabel}>unique genes in {summary.n} lists</span>
            </div>
            <button
              type="button"
              className={`${styles.kpi} ${styles.kpiButton}`}
              onClick={() => selectGenes(`Shared by all ${summary.n} lists`, summary.all, "kpi:all")}
              aria-pressed={selection?.key === "kpi:all"}
            >
              <span className={styles.kpiValue}>{summary.all.length.toLocaleString()}</span>
              <span className={styles.kpiLabel}>shared by all {summary.n}</span>
            </button>
            {summary.n > 2 && (
              <button
                type="button"
                className={`${styles.kpi} ${styles.kpiButton}`}
                onClick={() => selectGenes("In two or more lists", summary.shared, "kpi:shared")}
                aria-pressed={selection?.key === "kpi:shared"}
              >
                <span className={styles.kpiValue}>{summary.shared.length.toLocaleString()}</span>
                <span className={styles.kpiLabel}>in two or more lists</span>
              </button>
            )}
            <button
              type="button"
              className={`${styles.kpi} ${styles.kpiButton}`}
              onClick={() => selectGenes("In only one list", summary.single, "kpi:single")}
              aria-pressed={selection?.key === "kpi:single"}
            >
              <span className={styles.kpiValue}>{summary.single.length.toLocaleString()}</span>
              <span className={styles.kpiLabel}>in only one list</span>
            </button>
            {summary.best && (
              <div className={styles.kpi} title={`${summary.best.a} ∩ ${summary.best.b}`}>
                <span className={styles.kpiValue}>{summary.best.jaccard.toFixed(2)}</span>
                <span className={styles.kpiLabel}>
                  highest Jaccard: {summary.best.a} / {summary.best.b}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {library && library.length > 0 && !comparing && (
        <EmptyState
          title={compared.length === 1 ? "Select one more list" : "Select at least two lists to compare"}
          hint="Tick the lists above. Up to 10 lists can be compared at once; the Venn diagram shows 2–5."
        />
      )}

      {comparing && (
        <>
          <OverlapPlots
            sets={sets}
            combinations={combinations}
            view={settings.view || "upset"}
            onViewChange={(v) => set("view", v)}
            mode={mode}
            onModeChange={(m) => set("mode", m)}
            selection={hovered || selection?.highlight || null}
            onHover={setHovered}
            onSelect={selectCombination}
            settings={settings}
            plot={plot}
          />

          <SelectionPanel selection={selection} onClear={() => setSelection(null)} />

          <SimilarityMatrix
            lists={compared}
            colors={colors}
            overlaps={overlaps}
            background={background}
            onBackgroundChange={(n) => set("background", n)}
            onSelectPair={(p, key) => selectGenes(`${p.a} ∩ ${p.b}`, p.genes, key)}
            activeKey={selection?.key}
            highlightRgb={pagePalette.highlightRgb}
          />

          <MembershipTable lists={compared} rows={rows} colors={colors} drugs={drugs} />
        </>
      )}

      <ListEditor
        open={editor.open}
        initial={editor.list}
        existingNames={(library || []).map((l) => l.name)}
        onSave={saveList}
        onClose={() => setEditor({ open: false, list: null })}
      />
    </div>
  );
};

const mapStateToProps = ({ settings }) => ({
  settings: settings?.genelistcompare ?? {},
});

const ConnectedGenelistCompare = connect(mapStateToProps, { settingChanged: genelistcompareSettingsChanged })(GenelistCompare);

const MainContainer = withErrorBoundary(ConnectedGenelistCompare, {
  label: "Gene list comparison",
});

export { MainContainer as GenelistCompare };
