import { ROUTES } from "../common/routes";
import { coreSettingsChanged } from "../store/settings/core-settings";
import { geneRegulationCoreSettingsChanged } from "../store/settings/gene-regulation-core-settings";
import { expressionanalyzerSettingsChanged } from "../store/settings/expression-analyzer-settings";
import { multidatasetComparisonSettingsChanged } from "../store/settings/multidataset-comparison-settings";
import { baseSymbol, genePagePath } from "./geneLinks";

/**
 * Modules a gene or a gene list can be sent to.
 *   kind "list":   the genes become the perturbation list of the sidebar
 *   kind "target": the genes become the second (gene / signature) list
 *   kind "gene":   the module works on a single gene (the first one is used)
 * `min` is the smallest list the module accepts.
 */
export const SEND_TARGETS = [
  { id: "correlation", label: "Correlation", route: ROUTES.CORRELATION, kind: "list", min: 2 },
  { id: "dr", label: "DR & Clustering", route: ROUTES.DR, kind: "list", min: 10 },
  { id: "heatmap", label: "Heatmap", route: ROUTES.HEATMAP, kind: "list", min: 3 },
  { id: "pathfinder", label: "Path Explorer", route: ROUTES.PATHFINDER, kind: "list", min: 2 },
  { id: "deregulated", label: "Deregulated Genes", route: ROUTES.DEREGULATED_GENES, kind: "list", min: 1 },
  { id: "genesignature", label: "Gene Signature", route: ROUTES.GENESIGNATURE, kind: "target", min: 1 },
  { id: "geneRegulation", label: "Gene Regulation", route: ROUTES.GENE_REGULATION, kind: "gene", min: 1 },
  { id: "expressionAnalyzer", label: "Expression Analyzer", route: ROUTES.EXPRESSIONANALYZER, kind: "gene", min: 1 },
  { id: "multidataset", label: "Multi-Dataset Comparison", route: ROUTES.MULTIDATASET_COMPARISON, kind: "gene", min: 1 },
  { id: "genePage", label: "Gene page", route: ROUTES.GENE, kind: "gene", min: 1 },
];

export const sendTarget = (id) => SEND_TARGETS.find((target) => target.id === id);

/** Clean list of unique symbols from an array or free text. */
export const toGeneArray = (genes) => {
  const list = Array.isArray(genes) ? genes : String(genes || "").split(/[\s,;]+/);
  const seen = new Set();
  const result = [];
  list.forEach((gene) => {
    const symbol = String(gene || "").trim().toUpperCase();
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      result.push(symbol);
    }
  });
  return result;
};

/**
 * Thunk: load `genes` into the settings of a module and return the address to
 * navigate to. Usage: `navigate(dispatch(sendGenesTo("correlation", genes)))`.
 * `datasetId` (optional) also switches the selected dataset.
 */
export const sendGenesTo = (targetId, genes, { datasetId } = {}) => (dispatch, getState) => {
  const target = sendTarget(targetId);
  const list = toGeneArray(genes);
  if (!target || list.length === 0) return null;

  if (datasetId) {
    const datasets = getState()?.settings?.core?.datasetList || [];
    const dataset = datasets.find((d) => String(d.id).toLowerCase() === String(datasetId).toLowerCase());
    if (dataset) dispatch(coreSettingsChanged({ settingName: "cellLine", newValue: dataset }));
  }

  const first = baseSymbol(list[0]);
  switch (target.id) {
    case "genePage":
      return genePagePath(first);
    case "geneRegulation":
      dispatch(geneRegulationCoreSettingsChanged({ settingName: "selectedGene", newValue: first }));
      break;
    case "expressionAnalyzer":
      dispatch(expressionanalyzerSettingsChanged({ settingName: "selectedGene", newValue: first }));
      break;
    case "multidataset":
      dispatch(multidatasetComparisonSettingsChanged({ settingName: "selectedGene", newValue: first }));
      break;
    case "genesignature":
      dispatch(coreSettingsChanged({ settingName: "targetGeneList", newValue: list.join("+") }));
      break;
    default:
      dispatch(coreSettingsChanged({ settingName: "peturbationList", newValue: list.join("\n") }));
  }
  return target.route;
};
