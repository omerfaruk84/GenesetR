import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/genes`;

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || error?.message || fallback;

/** Gene symbols in the built-in datasets that match `query`, best first. */
export const searchGenes = async (query, { limit = 12, signal } = {}) => {
  const q = String(query || "").trim();
  if (!q) return [];
  const response = await Axios.get(BASE, { params: { q, limit }, signal });
  return response.data?.results || [];
};

/**
 * Cross-dataset summary of one gene (see API utils/gene_summary.py).
 * Rejects with an Error whose `notFound` is true when no dataset has the gene.
 */
export const fetchGeneSummary = async (symbol, { topN = 15, signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/${encodeURIComponent(symbol)}`, {
      params: { top_n: topN },
      signal,
    });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    const wrapped = new Error(errorMessage(error, "Could not load the gene summary"));
    wrapped.notFound = error?.response?.status === 404;
    throw wrapped;
  }
};

/**
 * Name, description and database ids of a human gene from mygene.info.
 * Best effort: resolves to null when the service is unreachable or has no hit,
 * the page works without it.
 */
export const fetchGeneInfo = async (symbol, { signal } = {}) => {
  try {
    const response = await Axios.get("https://mygene.info/v3/query", {
      params: {
        q: `symbol:${symbol}`,
        species: "human",
        size: 1,
        fields: "symbol,name,summary,alias,entrezgene,ensembl.gene,uniprot.Swiss-Prot",
      },
      signal,
      timeout: 8000,
    });
    const hit = response.data?.hits?.[0];
    if (!hit) return null;
    const first = (value) => (Array.isArray(value) ? value[0] : value);
    const ensembl = first(hit.ensembl);
    return {
      name: hit.name || null,
      summary: hit.summary || null,
      aliases: [].concat(hit.alias || []),
      entrez: hit.entrezgene ? String(hit.entrezgene) : null,
      ensembl: ensembl?.gene || null,
      uniprot: first(hit.uniprot?.["Swiss-Prot"]) || null,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Official symbols for which `text` is an alias or an old name (mygene.info).
 * Best effort: resolves to [] when nothing is found or the service is down.
 */
export const resolveGeneAlias = async (text, { signal } = {}) => {
  const query = String(text || "").trim();
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(query)) return [];
  try {
    const response = await Axios.get("https://mygene.info/v3/query", {
      params: { q: `alias:${query} OR symbol:${query}`, species: "human", size: 5, fields: "symbol,name" },
      signal,
      timeout: 8000,
    });
    const seen = new Set();
    return (response.data?.hits || [])
      .filter((hit) => hit.symbol && hit.symbol.toUpperCase() !== query.toUpperCase())
      .filter((hit) => !seen.has(hit.symbol) && seen.add(hit.symbol))
      .map((hit) => ({ symbol: hit.symbol.toUpperCase(), name: hit.name || "" }));
  } catch (error) {
    return [];
  }
};
