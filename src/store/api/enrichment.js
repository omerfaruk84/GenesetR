import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}`;

/**
 * Over-representation of a gene list in the gene-set libraries held by the
 * API (no external service):
 * { genes, backgroundSource, libraries: { id: { name, tested, queryGenes, background,
 *   sets: [{ set, overlap, setSize, p, q, fold, genes }] } } }.
 * Rejects with an Error that carries the API's message.
 */
export const fetchLocalEnrichment = async ({ genes = [], libraries, topN, maxQ, signal } = {}) => {
  const body = { genes };
  if (libraries) body.libraries = libraries;
  if (topN) body.top_n = topN;
  if (maxQ !== undefined) body.max_q = maxQ;
  try {
    const response = await Axios.post(`${BASE}/enrichment`, body, { signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    throw new Error(
      error?.response?.data?.error?.message ||
        (error?.response ? error?.message : null) ||
        "The server could not be reached. Check your connection and try again."
    );
  }
};

let corumPromise = null;

/**
 * How well each dataset recovers CORUM complexes:
 * { reference, maxComplexSize, datasets: { id: { genes, pairsSameComplex, auroc, precisionTop, baseline, topPairs } }, consensus }.
 * Asked once per session. Best effort: resolves to null when it is not built or the request fails.
 */
export const fetchCorumBenchmark = () => {
  if (!corumPromise) {
    corumPromise = Axios.get(`${BASE}/benchmark/corum`)
      .then((response) => response.data || null)
      .catch(() => {
        corumPromise = null;
        return null;
      });
  }
  return corumPromise;
};
