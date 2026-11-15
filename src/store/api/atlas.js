import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/atlas`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || (error?.response ? error?.message : null) || fallback;

const UNREACHABLE = "The server could not be reached. Check your connection and try again.";

let summaryPromise = null;

/**
 * What the atlas holds:
 * { maps: { pert: { name, objects, modules, named, linkScore }, genes },
 *   predictions: { predictions, genes, novelConfident, calibration: { "knockdown:go_bp": { tested, known, bins } } },
 *   pathways: { perturbations, sets, contexts, libraries: [{ id, name, sets }] } }.
 * Asked once per session. Best effort: resolves to null when the request fails.
 */
export const fetchAtlasSummary = () => {
  if (!summaryPromise) {
    summaryPromise = Axios.get(`${BASE}/summary`)
      .then((response) => response.data || null)
      .catch(() => {
        summaryPromise = null;
        return null;
      });
  }
  return summaryPromise;
};

const mapPromises = {};

/**
 * One map as column arrays: { axis, name, symbols, x, y, module (0 = none), modules: [{ id, name, size, named }] }.
 * Asked once per axis and session. Rejects with an Error that carries the API's message.
 */
export const fetchAtlasMap = (axis) => {
  if (!mapPromises[axis]) {
    mapPromises[axis] = Axios.get(`${BASE}/map/${encodeURIComponent(axis)}`)
      .then((response) => response.data)
      .catch((error) => {
        delete mapPromises[axis];
        throw new Error(errorMessage(error, UNREACHABLE));
      });
  }
  return mapPromises[axis];
};

/**
 * One answer of the atlas. Never rejects (except when aborted):
 * { status: "found", data } | { status: "notFound" } | { status: "error", message }.
 */
const fetchOne = async (path, params, signal) => {
  try {
    const response = await Axios.get(`${BASE}/${path}`, { params, signal });
    if (!response.data || response.data.found === false) return { status: "notFound" };
    return { status: "found", data: response.data };
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    if (error?.response?.status === 404) return { status: "notFound" };
    return { status: "error", message: errorMessage(error, UNREACHABLE) };
  }
};

/**
 * Modules of a map that match `q` (name, enriched term or member gene):
 * { total, modules: [{ id, name, size, named, density, members, terms }] }.
 * Rejects with an Error that carries the API's message.
 */
export const fetchAtlasModules = async (axis, { q = "", limit = 200, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/modules/${encodeURIComponent(axis)}`, { params: { q: q || undefined, limit }, signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    throw new Error(errorMessage(error, UNREACHABLE));
  }
};

/** One module with all members, enriched terms and its consequence tables. */
export const fetchAtlasModule = (axis, id, { signal } = {}) =>
  fetchOne(`modules/${encodeURIComponent(axis)}/${encodeURIComponent(id)}`, undefined, signal);

/**
 * One gene: place and partners on both maps and its predicted functions.
 * `topN` limits the partners; the predictions come complete (known ones and
 * those that rest on a chromosomal neighbour included).
 */
export const fetchAtlasGene = (symbol, { topN = 15, minConfidence = 0.1, signal } = {}) =>
  fetchOne(`gene/${encodeURIComponent(symbol)}`, { top_n: topN, min_confidence: minConfidence }, signal);

/**
 * A page of predicted functions: { total, genes, rows }.
 * `params` are the query parameters of the API (see `predictionParams`).
 * Rejects with an Error that carries the API's message.
 */
export const fetchAtlasPredictions = async (params, { signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/predictions`, { params, signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    throw new Error(errorMessage(error, UNREACHABLE));
  }
};

/** Gene sets whose name matches `q`: [{ library, name, size }]. Best effort: [] when the request fails. */
export const searchAtlasPathways = async (q, { library = "", limit = 30, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/pathways`, { params: { q, library: library || undefined, limit }, signal });
    return response.data?.sets || [];
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    return [];
  }
};

/** Knock-downs that raise or lower one gene set: { library, set, size, genes, up, down, tested }. */
export const fetchAtlasPathway = ({ library, name, topN = 25, minContexts = 2, minDatasets = 2, signal } = {}) =>
  fetchOne("pathway", { library, name, top_n: topN, min_datasets: minDatasets, min_contexts: minContexts }, signal);

/** Gene sets that the knock-down of one gene raises or lowers: { symbol, up, down, tested }. */
export const fetchAtlasPerturbationPathways = (symbol, { library = "", topN = 15, minContexts = 2, minDatasets = 2, signal } = {}) =>
  fetchOne(
    `pathways/perturbation/${encodeURIComponent(symbol)}`,
    { library: library || undefined, top_n: topN, min_datasets: minDatasets, min_contexts: minContexts },
    signal
  );
