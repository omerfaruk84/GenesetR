/**
 * Genetic or chemical? Every dataset of the registry says what its
 * perturbations are (`perturbationKind`: "gene", the default, or "drug").
 * All code that behaves differently for drug datasets asks here.
 */

export const isDrugDataset = (dataset) => dataset?.perturbationKind === "drug";

/** A dose or cell-line table that hangs under the main table of a drug collection. */
export const isDrugChildTable = (dataset) =>
  isDrugDataset(dataset) && !!dataset?.parent && (dataset.drugTable === "dose" || dataset.drugTable === "line");

/** Labels of dose and cell-line tables carry the dose ("BORTEZOMIB-0.5UM"). */
export const hasDoseLabels = (dataset) =>
  isDrugDataset(dataset) && (dataset?.drugTable === "dose" || dataset?.drugTable === "line");

/** "drug" / "perturbation" */
export const perturbationNoun = (dataset) => (isDrugDataset(dataset) ? "drug" : "perturbation");

/** "drugs" / "perturbations" */
export const perturbationNounPlural = (dataset) => (isDrugDataset(dataset) ? "drugs" : "perturbations");

/** Heading of a list of perturbations: "Drugs" / "Perturbations" */
export const perturbationTitle = (dataset) => (isDrugDataset(dataset) ? "Drugs" : "Perturbations");

/** Label of the perturbation count of a dataset: "Treatments" / "Perturbations" */
export const perturbationCountLabel = (dataset) => (isDrugDataset(dataset) ? "Treatments" : "Perturbations");

// Registry fields that travel with the selected dataset (`core.cellLine`).
// Note: `cellLine` here is the registry's cell-line name of the dataset.
const META_FIELDS = ["perturbationKind", "collection", "drugTable", "organ", "doses", "doseUnit", "cellLine", "parent"];

/** The kind-related registry fields of `dataset` that are set. */
export const datasetKindMeta = (dataset) => {
  const meta = {};
  META_FIELDS.forEach((field) => {
    if (dataset?.[field] !== undefined && dataset?.[field] !== null) meta[field] = dataset[field];
  });
  return meta;
};

/** First dataset a gene-only fallback may land on (never a drug dataset). */
export const firstGeneticDataset = (datasets) =>
  (datasets || []).find((d) => !isDrugDataset(d) && d?.isDrResult !== true && d?.isUserUploaded !== true) ||
  (datasets || []).find((d) => !isDrugDataset(d)) ||
  null;

const DOSE_SUFFIX = /-(\d+(?:\.\d+)?)UM$/;

/** "BORTEZOMIB-0.5UM" -> "BORTEZOMIB"; a bare drug id is returned as it is. */
export const drugIdOf = (label) => String(label || "").trim().toUpperCase().replace(DOSE_SUFFIX, "");

/** Dose of a label as a number ("BORTEZOMIB-0.5UM" -> 0.5), or null. */
export const doseOf = (label) => {
  const match = DOSE_SUFFIX.exec(String(label || "").trim().toUpperCase());
  return match ? Number(match[1]) : null;
};

/** Column labels of one drug in `dataset`: the id, or one label per dose. */
export const drugLabelsFor = (drugId, dataset) => {
  const id = drugIdOf(drugId);
  if (!id) return [];
  if (!hasDoseLabels(dataset)) return [id];
  const doses = Array.isArray(dataset?.doses) && dataset.doses.length > 0 ? dataset.doses : [0.05, 0.5, 5];
  return doses.map((dose) => `${id}-${dose}UM`);
};

/** In-app address of the drug page (the dose is stripped). */
export const drugPagePath = (label) => `/drug?id=${encodeURIComponent(drugIdOf(label))}`;
