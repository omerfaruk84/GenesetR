/**
 * Settings <-> URL.
 *
 * Every analysis page can be described by a small "snapshot": the selected
 * dataset, the gene lists and the settings of the slices that page uses. The
 * snapshot is written to the address bar (so a page can be bookmarked or sent
 * to a colleague) and stored whole in a permalink (see components/share-menu).
 *
 * Query string format (only values that differ from the defaults are written):
 *   ds=K562gwps                      selected dataset
 *   genes=ATF4,DDIT3                 first list of the sidebar (perturbations)
 *   targets=...                      second list (genes / signature formula)
 *   type=pert  graph=2D  module=pca  other core settings
 *   correlation.corrType=pearson     <slice>.<setting>=<value>
 * Strings are written as they are; numbers, booleans and arrays as JSON.
 */
import { ROUTES } from "../common/routes";
import { settingsReducer } from "./settings";
import { isDrugDataset } from "../utils/perturbationKind";

export const SNAPSHOT_VERSION = 1;

// Longer addresses get cut by mail clients and proxies: above this the gene
// lists are left out of the address (a permalink still carries them).
const MAX_QUERY_LENGTH = 1800;

// Settings as they are before the user touches anything
const DEFAULTS = settingsReducer(undefined, { type: "@@genesetr/defaults" });

/** Slices each page reads its settings from (besides `core`). */
const ROUTE_SLICES = {
  [ROUTES.CORRELATION]: ["correlation", "inchlib"],
  [ROUTES.DR]: ["pca", "mde", "umap", "tsne", "clustering", "scatterplot"],
  [ROUTES.HEATMAP]: ["heatMap", "inchlib"],
  [ROUTES.PATHFINDER]: ["pathfinder"],
  [ROUTES.GENESIGNATURE]: ["genesignature"],
  [ROUTES.DEREGULATED_GENES]: ["deregulatedGenes"],
  [ROUTES.EXPRESSIONANALYZER]: ["expressionanalyzer"],
  [ROUTES.MULTIDATASET_COMPARISON]: ["multidatasetComparison"],
  [ROUTES.GENE_REGULATION]: ["geneRegulationCore", "graphmap"],
  [ROUTES.GENE_REGULATION_ENHANCED]: ["geneRegulationEnhanced"],
};

// core setting -> query parameter
const CORE_PARAMS = {
  peturbationList: "genes",
  targetGeneList: "targets",
  dataType: "type",
  graphType: "graph",
  currentModule: "module",
};
const LIST_PARAMS = new Set(["genes", "targets"]);

// Pages on which a core setting is used (all others ignore it)
const LIST_PAGES = [
  ROUTES.CORRELATION, ROUTES.DR,
  ROUTES.HEATMAP, ROUTES.PATHFINDER, ROUTES.DEREGULATED_GENES,
];
const CORE_USED_ON = {
  currentModule: [ROUTES.DR],
  graphType: [ROUTES.DR],
  peturbationList: LIST_PAGES,
  targetGeneList: [...LIST_PAGES, ROUTES.GENESIGNATURE],
  dataType: [ROUTES.CORRELATION, ROUTES.DR, ROUTES.EXPRESSIONANALYZER],
};

export const hasUrlState = (pathname) => Object.prototype.hasOwnProperty.call(ROUTE_SLICES, pathname);

// JSON with object keys in a fixed order, so equal settings compare equal
// whatever order their keys were stored in.
const stableJson = (value) =>
  JSON.stringify(value, (key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.keys(item).sort().reduce((sorted, name) => ({ ...sorted, [name]: item[name] }), {})
      : item
  );

const sameValue = (a, b) => a === b || stableJson(a) === stableJson(b);

// Display-only slices: kept in permalinks, left out of the address bar
const ADDRESS_SKIP_SLICES = new Set(["inchlib"]);

const coreKeysFor = (pathname) =>
  Object.keys(CORE_PARAMS).filter((key) => !CORE_USED_ON[key] || CORE_USED_ON[key].includes(pathname));

/**
 * Snapshot of the settings a page depends on. With `full` every setting of the
 * page's slices is included (for permalinks); otherwise only the ones that
 * differ from the defaults (for the address bar).
 */
export const takeSnapshot = (settings, pathname, { full = false } = {}) => {
  const core = settings?.core || {};
  const snapshot = { v: SNAPSHOT_VERSION, core: {}, slices: {} };
  if (core.cellLine?.id && core.cellLine.isDrResult !== true) snapshot.core.ds = core.cellLine.id;
  // In a drug dataset the second list can hold drugs (analysis by measured
  // gene): their hyphens must not be read as the operators of a signature
  // formula. Only the Gene Signature page puts a formula there.
  if (isDrugDataset(core.cellLine) && pathname !== ROUTES.GENESIGNATURE) {
    snapshot.core.drugTargets = true;
  }
  coreKeysFor(pathname).forEach((key) => {
    if (full || !sameValue(core[key], DEFAULTS.core[key])) snapshot.core[key] = core[key];
  });
  (ROUTE_SLICES[pathname] || []).forEach((slice) => {
    const current = settings?.[slice] || {};
    const defaults = DEFAULTS[slice] || {};
    const values = {};
    Object.keys(current).forEach((key) => {
      if (full || !sameValue(current[key], defaults[key])) values[key] = current[key];
    });
    if (Object.keys(values).length > 0) snapshot.slices[slice] = values;
  });
  return snapshot;
};

const listToParam = (value) =>
  String(value || "").split(/[\s;,]+/).filter(Boolean).join(",");

const encode = (value) => (typeof value === "string" ? value : JSON.stringify(value));

/**
 * True when the second list ("targets") holds a signature formula ("A+B-C")
 * rather than a plain list. `drugList` says the list belongs to a drug
 * dataset, whose labels hold hyphens ("R-VERAPAMIL-HYDROCHLORIDE-0.5UM"):
 * such a list is never a formula.
 */
export const isSignatureFormula = (text, { drugList = false } = {}) =>
  !drugList && /[+-]/.test(String(text || ""));

/** True when the "targets" list of these core settings holds drug labels. */
const targetsHoldDrugs = (core) => core?.drugTargets === true;

/** Query string (without "?") for a snapshot. */
export const snapshotToQuery = (snapshot) => {
  const build = (withLists) => {
    const params = new URLSearchParams();
    const core = snapshot.core || {};
    if (core.ds) params.set("ds", core.ds);
    Object.entries(CORE_PARAMS).forEach(([key, param]) => {
      if (core[key] === undefined) return;
      if (LIST_PARAMS.has(param)) {
        // A signature formula ("A+B-C") is kept as it is; plain lists get commas
        const formula = param === "targets" && isSignatureFormula(core[key], { drugList: targetsHoldDrugs(core) });
        const text = formula ? String(core[key]) : listToParam(core[key]);
        if (withLists) params.set(param, text);
      } else {
        params.set(param, encode(core[key]));
      }
    });
    Object.entries(snapshot.slices || {}).forEach(([slice, values]) => {
      if (ADDRESS_SKIP_SLICES.has(slice)) return;
      Object.entries(values).forEach(([key, value]) => params.set(`${slice}.${key}`, encode(value)));
    });
    if (targetsHoldDrugs(core) && withLists && params.has("targets")) params.set("tk", "drug");
    return params.toString();
  };
  const query = build(true);
  return query.length <= MAX_QUERY_LENGTH ? query : build(false);
};

const decode = (text, defaultValue) => {
  if (typeof defaultValue === "string") return text;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

/** Snapshot described by a query string, or null when it holds no settings. */
export const queryToSnapshot = (search, pathname) => {
  const params = new URLSearchParams(search);
  const snapshot = { v: SNAPSHOT_VERSION, core: {}, slices: {} };
  let found = false;
  if (params.get("ds")) {
    snapshot.core.ds = params.get("ds");
    found = true;
  }
  // tk=drug: the "targets" list holds drug labels (see takeSnapshot)
  const drugList = params.get("tk") === "drug";
  if (drugList) snapshot.core.drugTargets = true;
  Object.entries(CORE_PARAMS).forEach(([key, param]) => {
    if (!params.has(param)) return;
    const text = params.get(param);
    if (LIST_PARAMS.has(param)) {
      const isFormula = param === "targets" && isSignatureFormula(text, { drugList });
      snapshot.core[key] = isFormula ? text : text.split(",").filter(Boolean).join("\n");
    } else {
      snapshot.core[key] = decode(text, DEFAULTS.core[key]);
    }
    found = true;
  });
  const slices = ROUTE_SLICES[pathname] || [];
  params.forEach((text, name) => {
    const dot = name.indexOf(".");
    if (dot < 1) return;
    const slice = name.slice(0, dot);
    const key = name.slice(dot + 1);
    // Only known settings of this page's slices are accepted from an address
    if (!slices.includes(slice) || !Object.prototype.hasOwnProperty.call(DEFAULTS[slice] || {}, key)) return;
    snapshot.slices[slice] = snapshot.slices[slice] || {};
    snapshot.slices[slice][key] = decode(text, DEFAULTS[slice][key]);
    found = true;
  });
  return found ? snapshot : null;
};

/**
 * Thunk: load a snapshot into the store. Unknown slices and settings are
 * ignored, so an old or hand-edited link cannot put arbitrary data in the state.
 */
export const applySnapshot = (snapshot) => (dispatch, getState) => {
  if (!snapshot || typeof snapshot !== "object") return;
  const core = snapshot.core || {};
  const setCore = (settingName, newValue) =>
    dispatch({ type: "core/coreSettingsChanged", payload: { settingName, newValue } });

  if (core.ds) {
    const datasets = getState()?.settings?.core?.datasetList || [];
    const dataset = datasets.find((d) => String(d.id).toLowerCase() === String(core.ds).toLowerCase());
    if (dataset && dataset.id !== getState().settings.core.cellLine?.id) setCore("cellLine", dataset);
  }
  Object.keys(CORE_PARAMS).forEach((key) => {
    if (core[key] !== undefined && !sameValue(core[key], getState().settings.core[key])) setCore(key, core[key]);
  });
  Object.entries(snapshot.slices || {}).forEach(([slice, values]) => {
    if (!DEFAULTS[slice] || slice === "core" || !values || typeof values !== "object") return;
    Object.entries(values).forEach(([settingName, newValue]) => {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS[slice], settingName)) return;
      if (sameValue(newValue, getState().settings[slice]?.[settingName])) return;
      dispatch({ type: `${slice}/${slice}SettingsChanged`, payload: { settingName, newValue } });
    });
  });
};
