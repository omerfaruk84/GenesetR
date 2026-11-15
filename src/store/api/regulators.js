import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/regulators`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || (error?.response ? error?.message : null) || fallback;

let sourcesPromise = null;

/**
 * Datasets behind the TF regulator analysis:
 * { gain: [{ dataset, name }], loss: [{ dataset, name }], transcriptionFactors }.
 * Asked once per session. Best effort: resolves to null when the request fails.
 */
export const fetchRegulatorSources = () => {
  if (!sourcesPromise) {
    sourcesPromise = Axios.get(`${BASE}/sources`)
      .then((response) => response.data || null)
      .catch(() => {
        sourcesPromise = null;
        return null;
      });
  }
  return sourcesPromise;
};

/**
 * Transcription factors that raise or lower one gene.
 * Best effort: resolves to null when the gene is measured nowhere or the request fails.
 */
export const fetchRegulatorsOfGene = async (symbol, { topN = 20, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/gene/${encodeURIComponent(symbol)}`, {
      params: { top_n: topN },
      signal,
    });
    return response.data || null;
  } catch (error) {
    return null;
  }
};

/**
 * Transcription factors that move a signature (genes that go up, genes that go down).
 * Rejects with an Error that carries the API's message (for example when fewer
 * than 3 genes are given); `network` is true when the server was not reached.
 */
export const fetchRegulatorsOfGeneSet = async ({ up = [], down = [], topN = 25, signal } = {}) => {
  try {
    const response = await Axios.post(`${BASE}/gene-set`, { up, down, top_n: topN }, { signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    const wrapped = new Error(
      errorMessage(error, "The server could not be reached. Check your connection and try again.")
    );
    wrapped.network = !error?.response;
    throw wrapped;
  }
};
