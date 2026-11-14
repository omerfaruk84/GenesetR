import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/drugs`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || error?.message || fallback;

/** Drugs that match `query` by name, target gene or mechanism, best first. */
export const searchDrugs = async (query, { limit = 20, signal } = {}) => {
  const q = String(query || "").trim();
  if (!q) return [];
  const response = await Axios.get(BASE, { params: { q, limit }, signal });
  return response.data?.results || [];
};

/**
 * Column labels of a drug dataset: { LABEL: { drugId, name, dose, display,
 * targets, moaFine, moaBroad, known } }. Rejects for a dataset without drugs.
 */
export const fetchDrugLabels = async (dataset, { signal } = {}) => {
  const response = await Axios.get(`${BASE}/labels`, { params: { dataset }, signal });
  return response.data?.labels || {};
};

/** Tables of the drug collection (main, all doses, one per cell line). */
export const fetchDrugCollection = async ({ signal } = {}) => {
  const response = await Axios.get(`${BASE}/collection`, { signal });
  return response.data || { tables: [] };
};

/**
 * Everything about one drug (see the API's drug summary).
 * Rejects with an Error whose `notFound` is true for an unknown id.
 */
export const fetchDrugSummary = async (drugId, { topN = 15, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/${encodeURIComponent(drugId)}`, {
      params: { top_n: topN },
      signal,
    });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    const wrapped = new Error(errorMessage(error, "Could not load the drug summary"));
    wrapped.notFound = error?.response?.status === 404;
    throw wrapped;
  }
};

/**
 * Drugs connected to a gene: annotated to target it, changing its expression,
 * or with a profile like / opposite to its knock-down.
 * Best effort: resolves to null when the request fails.
 */
export const fetchDrugsForGene = async (symbol, { topN = 10, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/for-gene/${encodeURIComponent(symbol)}`, {
      params: { top_n: topN },
      signal,
    });
    return response.data || null;
  } catch (error) {
    return null;
  }
};
