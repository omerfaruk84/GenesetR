import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/interactions`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || (error?.response ? error?.message : null) || fallback;

const UNREACHABLE = "The server could not be reached. Check your connection and try again.";

/**
 * One answer. Never rejects (except when aborted):
 * { status: "found", data } | { status: "notFound" } | { status: "error", message }.
 */
const fetchOne = async (path, params, signal) => {
  try {
    const response = await Axios.get(path ? `${BASE}/${path}` : BASE, { params, signal });
    if (!response.data || response.data.found === false) return { status: "notFound" };
    return { status: "found", data: response.data };
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    if (error?.response?.status === 404) return { status: "notFound" };
    return { status: "error", message: errorMessage(error, UNREACHABLE) };
  }
};

let datasetsPromise = null;

/**
 * The combinatorial datasets:
 * { datasets: [{ id, name, cellLine, perturbationType, citation, singles, pairs, genes, classes }], classLabels }.
 * Asked once per session (again after a failure).
 */
export const fetchInteractionDatasets = () => {
  if (!datasetsPromise) {
    datasetsPromise = fetchOne("").then((answer) => {
      if (answer.status !== "found") datasetsPromise = null;
      return answer;
    });
  }
  return datasetsPromise;
};

const pairsPromises = {};

/**
 * Every pair of a dataset: { dataset, classLabels, fdr, singles, pairs: [{ a, b, label, cells, strongGenes,
 * genesUsed, interactionGenes, more, less, coefficients, fit, additiveFit, magnitude, similarity, dominant,
 * class, classLabel }] }. Asked once per dataset and session.
 */
export const fetchInteractionPairs = (dataset) => {
  if (!pairsPromises[dataset]) {
    pairsPromises[dataset] = fetchOne(encodeURIComponent(dataset)).then((answer) => {
      if (answer.status !== "found") delete pairsPromises[dataset];
      return answer;
    });
  }
  return pairsPromises[dataset];
};

/**
 * One pair: its row plus `nullSpread`, the genes the pair moves more (`above`)
 * and less (`below`) than the sum of the two single genes, and `points`
 * ({ gene, expected, observed, significant }) for the expected-versus-observed plot.
 */
export const fetchInteractionPair = (dataset, a, b, { topN = 200, signal } = {}) =>
  fetchOne(`${encodeURIComponent(dataset)}/pair`, { a, b, top_n: topN }, signal);

/** The pairs of one gene in every combinatorial dataset: { symbol, datasets: [{ dataset, name, strongGenes, cells, pairs }] }. */
export const fetchGeneInteractions = (symbol, { signal } = {}) => fetchOne(`gene/${encodeURIComponent(symbol)}`, undefined, signal);
