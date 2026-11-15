import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/integrated`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || (error?.response ? error?.message : null) || fallback;

const UNREACHABLE = "The server could not be reached. Check your connection and try again.";

let summaryPromise = null;

/**
 * What the integrated layer is built from:
 * { datasets: [ids], contexts: { context: [ids] }, perturbations, genes, gain: [ids], supportZ, strongZ, fdr,
 *   corrections: { id: { inert, axes, nullSd } | null } }.
 * Asked once per session. Best effort: resolves to null when the request fails.
 */
export const fetchIntegratedSummary = () => {
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

/**
 * One gene from one side. Never rejects (except when aborted):
 * { status: "found", data } | { status: "notFound" } | { status: "error", message }.
 */
const fetchSide = async (side, symbol, { topN = 20, minContexts = 2, minDatasets = 2, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/${side}/${encodeURIComponent(symbol)}`, {
      params: { top_n: topN, min_datasets: minDatasets, min_contexts: minContexts },
      signal,
    });
    if (!response.data || response.data.found === false) return { status: "notFound" };
    return { status: "found", data: response.data };
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    if (error?.response?.status === 404) return { status: "notFound" };
    return { status: "error", message: errorMessage(error, UNREACHABLE) };
  }
};

/** Consensus effects of perturbing a gene, over all loss-of-function datasets. */
export const fetchIntegratedPerturbation = (symbol, options) => fetchSide("perturbation", symbol, options);

/**
 * Second genes whose mRNA falls under a knock-down and whose own loss could explain its profile
 * ({ suspects: [{ gene, kind, minZ, datasets, score, distance }], reduced }). Best effort: null when
 * the gene is not perturbed or the request fails.
 */
export const fetchCollateral = async (symbol, { signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/perturbation/${encodeURIComponent(symbol)}/collateral`, { signal });
    return response.data && response.data.found !== false ? response.data : null;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    return null;
  }
};

/** Consensus regulators of a measured gene, over all loss-of-function datasets. */
export const fetchIntegratedGene = (symbol, options) => fetchSide("gene", symbol, options);

/**
 * Gene sets whose genes go up or down over the whole consensus profile of a perturbation:
 * { symbol, found, genes, libraries: { id: { name, tested, up: [{ set, setSize, z, meanZ, q, genes }], down: [...] } } }.
 * Best effort: resolves to null when the gene is not perturbed or the request fails.
 */
export const fetchIntegratedPathways = async (symbol, { topN = 15, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/perturbation/${encodeURIComponent(symbol)}/pathways`, {
      params: { top_n: topN },
      signal,
    });
    return response.data && response.data.found !== false ? response.data : null;
  } catch (error) {
    return null;
  }
};

/**
 * A GET that never rejects (except when aborted):
 * { status: "found", data } | { status: "notFound" } | { status: "error", message }.
 */
const fetchAnswer = async (path, params, signal) => {
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
 * One knock-down in one dataset: the genes that change at a false discovery rate of 5 %
 * ({ genesMeasured, significant, significantUp, significantDown, corrected, expressed, up, down }).
 */
export const fetchIntegratedProfile = (symbol, dataset, { topN = 25, signal } = {}) =>
  fetchAnswer(`perturbation/${encodeURIComponent(symbol)}/profile`, { dataset, top_n: topN }, signal);

/**
 * Predicted effect of a knock-down in a dataset that did not perturb the gene
 * ({ measured, reliable, reason, accuracy, basis, neighbours, up, down }).
 */
export const fetchIntegratedPrediction = (symbol, dataset, { topN = 20, signal } = {}) =>
  fetchAnswer(`perturbation/${encodeURIComponent(symbol)}/prediction`, { dataset, top_n: topN }, signal);

let benchmarkPromise = null;

/**
 * Held-out accuracy of the predictions per dataset ({ settings, datasets: { id: { all, strong, reliable } } }).
 * Asked once per session. Best effort: resolves to null when the request fails.
 */
export const fetchPredictionBenchmark = () => {
  if (!benchmarkPromise) {
    benchmarkPromise = Axios.get(`${BASE}/prediction-benchmark`)
      .then((response) => response.data || null)
      .catch(() => {
        benchmarkPromise = null;
        return null;
      });
  }
  return benchmarkPromise;
};

const post = async (path, body, signal) => {
  try {
    const response = await Axios.post(`${BASE}/${path}`, body, { signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    const wrapped = new Error(errorMessage(error, UNREACHABLE));
    wrapped.network = !error?.response;
    throw wrapped;
  }
};

/**
 * Perturbations that move a signature, combined over the datasets.
 * Rejects with an Error that carries the API's message.
 */
export const fetchIntegratedSignature = ({ up = [], down = [], topN = 25, minContexts = 2, minDatasets = 2, signal } = {}) =>
  post("signature", { up, down, top_n: topN, min_datasets: minDatasets, min_contexts: minContexts }, signal);

/**
 * Genes changed consistently by all the listed perturbations.
 * Rejects with an Error that carries the API's message.
 */
export const fetchIntegratedPerturbationSet = ({ perturbations = [], topN = 25, signal } = {}) =>
  post("perturbation-set", { perturbations, top_n: topN }, signal);
