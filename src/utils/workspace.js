/**
 * The workspace: the user's saved gene lists.
 *
 * They are kept in this browser (IndexedDB) in the format the gene list boxes
 * have always used, so lists saved anywhere in the app show up everywhere:
 *   "geneListNames"   Set of list ids
 *   "genelist_<id>"   { label, value, genes, description, timestamp }
 */
import { useSyncExternalStore } from "react";
import { del, get, set } from "../store/safeIdb";
import { toGeneArray } from "./sendTo";

export const EXPORT_FORMAT = "genesetr-workspace";
const MIN_NAME_LENGTH = 3;

// Components that show the workspace re-read it when this number changes
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
/** Changes whenever a list is saved, deleted or imported through this module. */
export const useWorkspaceVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

const readNames = async () => new Set([...((await get("geneListNames")) || [])]);

const countGenes = (genes) => toGeneArray(String(genes || "").replace(/[+-]/g, " ")).length;

/** All saved lists, newest first: [{ id, name, genes, description, timestamp, count }]. */
export const listGeneLists = async () => {
  const names = [...(await readNames())];
  const records = await Promise.all(names.map((id) => get(`genelist_${id}`)));
  return names
    .map((id, index) => {
      const record = records[index];
      if (!record) return null;
      return {
        id,
        name: record.label || record.value || id,
        genes: record.genes || "",
        description: record.description || "",
        timestamp: record.timestamp || 0,
        count: countGenes(record.genes),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Save a list under `name` (replaces a list with the same name).
 * `genes` is an array or free text. Resolves to the stored id.
 */
export const saveGeneList = async (name, genes, description = "") => {
  const id = String(name || "").trim();
  if (id.length < MIN_NAME_LENGTH) throw new Error(`The name needs at least ${MIN_NAME_LENGTH} characters`);
  const text = Array.isArray(genes) ? toGeneArray(genes).join("\n") : String(genes || "").trim();
  if (!text) throw new Error("The list is empty");
  await set(`genelist_${id}`, { label: id, value: id, genes: text, description, timestamp: Date.now() });
  const names = await readNames();
  names.add(id);
  await set("geneListNames", names);
  changed();
  return id;
};

export const deleteGeneList = async (id) => {
  await del(`genelist_${id}`);
  const names = await readNames();
  names.delete(id);
  await set("geneListNames", names);
  changed();
};

/** The whole workspace as a JSON string (for a file the user keeps). */
export const exportWorkspace = async () => {
  const lists = await listGeneLists();
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: 1,
      exported: new Date().toISOString(),
      geneLists: lists.map(({ name, genes, description, timestamp }) => ({ name, genes, description, timestamp })),
    },
    null,
    2
  );
};

/**
 * Add the lists of an exported file. Lists whose name already exists are
 * replaced. Resolves to the number of lists imported.
 */
export const importWorkspace = async (jsonText) => {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("This is not a JSON file");
  }
  if (parsed?.format !== EXPORT_FORMAT || !Array.isArray(parsed.geneLists)) {
    throw new Error("This file is not a GeneSetR workspace export");
  }
  let imported = 0;
  for (const item of parsed.geneLists) {
    const name = String(item?.name || "").trim();
    const genes = typeof item?.genes === "string" ? item.genes : "";
    if (name.length < MIN_NAME_LENGTH || !genes.trim() || genes.length > 2_000_000) continue;
    // eslint-disable-next-line no-await-in-loop
    await saveGeneList(name, genes, typeof item.description === "string" ? item.description : "");
    imported += 1;
  }
  return imported;
};
