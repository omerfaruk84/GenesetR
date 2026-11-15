import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/cellcycle`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || (error?.response ? error?.message : null) || fallback;

const fail = (error, fallback) => {
  const err = new Error(errorMessage(error, fallback));
  err.status = error?.response?.status;
  err.network = !error?.response;
  return err;
};

let datasetsPromise = null;

/** Every dataset with cell-cycle data (asked once per session). */
export const fetchCellCycleDatasets = () => {
  if (!datasetsPromise) {
    datasetsPromise = Axios.get(`${BASE}/datasets`)
      .then((response) => response.data)
      .catch((error) => {
        datasetsPromise = null;
        throw fail(error, "The cell-cycle datasets could not be loaded");
      });
  }
  return datasetsPromise;
};

const tableCache = new Map();

/** All perturbations of one dataset: { dataset, columns, rows, control }. */
export const fetchCellCycleTable = (datasetId, { signal } = {}) => {
  if (tableCache.has(datasetId)) return tableCache.get(datasetId);
  const promise = Axios.get(`${BASE}/datasets/${encodeURIComponent(datasetId)}/perturbations`, { signal })
    .then((response) => response.data)
    .catch((error) => {
      tableCache.delete(datasetId);
      throw fail(error, "The perturbations of this dataset could not be loaded");
    });
  tableCache.set(datasetId, promise);
  return promise;
};

/** One perturbation of one dataset with score densities; null when it is not in the dataset. */
export const fetchCellCyclePerturbation = async (datasetId, target, { signal } = {}) => {
  try {
    const response = await Axios.get(
      `${BASE}/datasets/${encodeURIComponent(datasetId)}/perturbations/${encodeURIComponent(target)}`,
      { signal }
    );
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw fail(error, "The perturbation could not be loaded");
  }
};

/** One perturbed gene in every genetic dataset. */
export const fetchCellCycleGene = async (symbol, { signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/genes/${encodeURIComponent(symbol)}`, { signal });
    return response.data;
  } catch (error) {
    throw fail(error, "The gene could not be looked up");
  }
};

/** Perturbation x dataset matrix of one metric. */
export const fetchCellCycleCompare = async ({ datasets, metric, minCells = 0, minDatasets = 1, signal } = {}) => {
  try {
    const response = await Axios.post(`${BASE}/compare`, { datasets, metric, min_cells: minCells, min_datasets: minDatasets }, { signal });
    return response.data;
  } catch (error) {
    throw fail(error, "The comparison failed");
  }
};
