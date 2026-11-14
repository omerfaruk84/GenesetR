/**
 * Column labels of drug datasets.
 *
 * A drug dataset labels its columns with drug ids ("BORTEZOMIB",
 * "BORTEZOMIB-0.5UM"), never with display names. This module fetches the
 * label table of a dataset once (`/api/v1/drugs/labels`), keeps it in memory
 * and answers "what is this label?" for tooltips, tables and links.
 *
 * The sidebar tells it which drug datasets are in use (`setActiveDrugDatasets`);
 * `describe(label)` then recognises their labels without the caller having to
 * know the dataset.
 */
import { useEffect, useSyncExternalStore } from "react";
import { fetchDrugLabels } from "../store/api/drugs";
import { genePagePath } from "./geneLinks";
import { doseOf, drugIdOf, drugPagePath, isDrugDataset } from "./perturbationKind";

const tables = new Map(); // dataset id -> { LABEL: record }
const inFlight = new Map(); // dataset id -> Promise
let active = []; // dataset ids whose labels `describe` recognises

// Components that show labels re-render when a table arrives
let version = 0;
const listeners = new Set();
const changed = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Label table of a drug dataset; resolves to {} when it cannot be loaded. */
export const loadDrugLabels = (datasetId) => {
  const id = String(datasetId || "");
  if (!id) return Promise.resolve({});
  if (tables.has(id)) return Promise.resolve(tables.get(id));
  if (inFlight.has(id)) return inFlight.get(id);
  const request = fetchDrugLabels(id)
    .then((labels) => {
      const table = {};
      Object.entries(labels || {}).forEach(([label, record]) => {
        table[String(label).toUpperCase()] = record;
      });
      tables.set(id, table);
      changed();
      return table;
    })
    .catch(() => ({})) // not cached: retried the next time it is asked for
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
};

/** Put a label table in the cache (tests, and pages that already hold one). */
export const primeDrugLabels = (datasetId, labels) => {
  const table = {};
  Object.entries(labels || {}).forEach(([label, record]) => {
    table[String(label).toUpperCase()] = record;
  });
  tables.set(String(datasetId), table);
  changed();
};

/** Drug datasets in use: their tables are loaded and searched by `describe`. */
export const setActiveDrugDatasets = (datasetIds) => {
  const next = Array.from(new Set((datasetIds || []).filter(Boolean).map(String)));
  if (next.join("\u0000") === active.join("\u0000")) return;
  active = next;
  next.forEach((id) => loadDrugLabels(id));
  changed();
};

/** True while a drug dataset is in use (cheap test before looking at lists). */
export const hasActiveDrugDatasets = () => active.length > 0;

const clean = (label) => String(label || "").trim().toUpperCase();

/**
 * What a label of a drug dataset stands for, or null when it is not a known
 * drug label (a gene symbol, a label of a genetic dataset, a table not loaded
 * yet). `datasetId` limits the lookup to one dataset; without it the datasets
 * in use are searched.
 *
 * Returns { label, drugId, name, dose, doseUnit, display, targets, moaFine, moaBroad }.
 */
export const describe = (label, datasetId) => {
  const key = clean(label);
  if (!key) return null;
  const ids = datasetId ? [String(datasetId)] : active;
  for (const id of ids) {
    const record = tables.get(id)?.[key];
    if (record) {
      return {
        label: key,
        drugId: record.drugId || drugIdOf(key),
        name: record.name || record.drugId || key,
        dose: record.dose ?? doseOf(key),
        doseUnit: record.doseUnit || "µM",
        display: record.display || record.name || key,
        targets: Array.isArray(record.targets) ? record.targets : [],
        moaFine: record.moaFine || "",
        moaBroad: record.moaBroad || "",
      };
    }
  }
  return null;
};

export const isDrugLabel = (label, datasetId) => describe(label, datasetId) !== null;

/** True when the list is made of drug labels (most of it; a typo does not flip it). */
export const isDrugList = (labels, datasetId) => {
  const list = (labels || []).filter(Boolean);
  if (list.length === 0) return false;
  const known = list.filter((label) => isDrugLabel(label, datasetId)).length;
  return known > 0 && known >= list.length / 2;
};

/** "Bortezomib · 0.5 µM" for a drug label, the label itself otherwise. */
export const displayLabel = (label, datasetId) => describe(label, datasetId)?.display || String(label ?? "");

/** One line for plain-text tooltips: "Bortezomib · 0.5 µM · Proteasome inhibitor · targets PSMB5". */
export const describeLine = (label, datasetId) => {
  const drug = describe(label, datasetId);
  if (!drug) return "";
  return [
    drug.display,
    drug.moaFine || drug.moaBroad,
    drug.targets.length > 0 ? `targets ${drug.targets.slice(0, 6).join(", ")}${drug.targets.length > 6 ? "…" : ""}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
};

/**
 * A drug in the shape the gene tooltips expect ({ name, description }), so the
 * shared tooltip code shows the drug instead of asking a gene database.
 */
export const drugTooltipInfo = (label, datasetId) => {
  const drug = describe(label, datasetId);
  if (!drug) return null;
  const parts = [];
  if (drug.moaFine || drug.moaBroad) parts.push(`Mechanism: ${drug.moaFine || drug.moaBroad}`);
  parts.push(drug.targets.length > 0 ? `Annotated targets: ${drug.targets.join(", ")}` : "No annotated target");
  return { name: drug.display, description: `Drug. ${parts.join(". ")}.`, isDrug: true };
};

/** Page of a label: the drug page for a drug label, the gene page otherwise. */
export const entityPagePath = (label, datasetId) =>
  isDrugLabel(label, datasetId) ? drugPagePath(label) : genePagePath(label);

/** Re-render when a label table arrives; returns a number that changes then. */
export const useDrugLabelsVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

/**
 * Keep the label tables of the drug datasets among `datasets` loaded and
 * searchable while the component is mounted.
 */
export const useActiveDrugDatasets = (datasets) => {
  // a DR result of a drug dataset keeps the labels of the dataset it came from
  const ids = (datasets || []).filter(isDrugDataset).map((d) => d.labelsFrom || d.id);
  const key = ids.join("\u0000");
  useEffect(() => {
    setActiveDrugDatasets(key ? key.split("\u0000") : []);
  }, [key]);
  return useDrugLabelsVersion();
};
