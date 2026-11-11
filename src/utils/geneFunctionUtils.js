/**
 * Utility functions for retrieving gene function information
 */
import { escapeHtml } from "./escapeHtml";

/**
 * Cleans gene symbol by removing underscores and taking the first part
 * @param {string} geneSymbol - The gene symbol to clean
 * @returns {string} - Cleaned gene symbol
 */
export const cleanGeneSymbol = (geneSymbol) => {
  if (!geneSymbol) return '';
  // Split by underscore and take the first part
  return String(geneSymbol).split('_')[0];
};

// Canonical Harmonizome host. (The former amp.pharm.mssm.edu address only
// works through a redirect to this one.)
const HARMONIZOME_GENE_URL = "https://maayanlab.cloud/Harmonizome/api/1.0/gene/";

/**
 * Fetches gene information from Harmonizome API (uncached, raw text).
 * Prefer getGeneInfo(), which caches and de-duplicates requests.
 * @param {string} geneSymbol - The gene symbol to look up
 * @returns {Promise<string|null>} - Raw response text, or null when unavailable
 */
export const fetchGeneInfo = async (geneSymbol) => {
  try {
    const cleanSymbol = cleanGeneSymbol(geneSymbol);
    if (!cleanSymbol) return null;
    const response = await fetch(
      `${HARMONIZOME_GENE_URL}${encodeURIComponent(cleanSymbol)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`Failed to fetch gene info for ${geneSymbol}:`, error);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Shared gene-info cache
//
// One cache for every tooltip in the app:
//  - memory (Map) in front of localStorage
//  - namespaced keys ("genesetr:geneinfo:v1:<SYMBOL>") so entries can never
//    collide with other data and can be evicted safely
//  - positive entries live 30 days, "gene unknown" answers 1 day
//  - at most GENE_INFO_MAX_ENTRIES entries are kept (oldest evicted first)
//  - concurrent lookups of the same gene share one request
// ---------------------------------------------------------------------------
export const GENE_INFO_CACHE_PREFIX = "genesetr:geneinfo:v1:";
export const GENE_INFO_MAX_ENTRIES = 500;
const GENE_INFO_EVICTION_SLACK = 50; // evict in batches, not on every write
const GENE_INFO_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GENE_INFO_NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const geneInfoMemoryCache = new Map(); // SYMBOL -> { t: time, v: info | null }
const geneInfoInFlight = new Map(); // SYMBOL -> Promise

const cacheKeyFor = (geneSymbol) => cleanGeneSymbol(geneSymbol).toUpperCase();

const isEntryFresh = (entry) => {
  if (!entry || typeof entry.t !== "number") return false;
  const ttl = entry.v === null ? GENE_INFO_NEGATIVE_TTL_MS : GENE_INFO_TTL_MS;
  return Date.now() - entry.t < ttl;
};

const getStorage = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (e) {
    return null; // access denied (privacy mode / sandboxed frame)
  }
};

const readStoredEntry = (symbolKey) => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(GENE_INFO_CACHE_PREFIX + symbolKey);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== "object" || typeof entry.t !== "number") return null;
    if (entry.v !== null && typeof entry.v !== "object") return null;
    return entry;
  } catch (e) {
    return null;
  }
};

/** Drop the oldest namespaced entries once the cap (plus slack) is exceeded. */
const evictOldEntries = (storage) => {
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(GENE_INFO_CACHE_PREFIX)) keys.push(key);
    }
    if (keys.length <= GENE_INFO_MAX_ENTRIES + GENE_INFO_EVICTION_SLACK) return;

    const aged = keys.map((key) => {
      let time = 0;
      try {
        time = JSON.parse(storage.getItem(key))?.t || 0;
      } catch (e) {
        time = 0; // unreadable entries go first
      }
      return { key, time };
    });
    aged.sort((a, b) => a.time - b.time);
    aged
      .slice(0, aged.length - GENE_INFO_MAX_ENTRIES)
      .forEach(({ key }) => storage.removeItem(key));
  } catch (e) {
    // Eviction is best effort.
  }
};

const writeStoredEntry = (symbolKey, entry) => {
  const storage = getStorage();
  if (!storage) return;
  const key = GENE_INFO_CACHE_PREFIX + symbolKey;
  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // Quota exceeded: make room once and retry; the memory cache works regardless.
    try {
      evictOldEntries(storage);
      storage.setItem(key, JSON.stringify(entry));
    } catch (e2) {
      return;
    }
  }
  evictOldEntries(storage);
};

/**
 * Older builds cached gene info under the bare gene symbol. Move such an entry
 * into the namespaced cache the first time it is needed.
 */
const migrateLegacyEntry = (geneSymbol) => {
  const storage = getStorage();
  if (!storage) return null;
  const candidates = Array.from(
    new Set([cleanGeneSymbol(geneSymbol), String(geneSymbol ?? "")].filter(Boolean))
  );
  for (const legacyKey of candidates) {
    try {
      const raw = storage.getItem(legacyKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const looksLikeGeneInfo =
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        ("description" in parsed || "symbol" in parsed || "name" in parsed);
      if (!looksLikeGeneInfo) continue;
      storage.removeItem(legacyKey);
      return parsed;
    } catch (e) {
      // not JSON: not ours, leave it alone
    }
  }
  return null;
};

const rememberGeneInfo = (symbolKey, info) => {
  const entry = { t: Date.now(), v: info };
  geneInfoMemoryCache.set(symbolKey, entry);
  writeStoredEntry(symbolKey, entry);
  return info;
};

/**
 * Synchronous cache lookup (memory, then localStorage).
 * @returns {object|null|undefined} parsed info, null when the gene is known to
 *   have no information, undefined when nothing (fresh) is cached.
 */
export const getCachedGeneInfo = (geneSymbol) => {
  const symbolKey = cacheKeyFor(geneSymbol);
  if (!symbolKey) return null;

  const inMemory = geneInfoMemoryCache.get(symbolKey);
  if (inMemory) {
    if (isEntryFresh(inMemory)) return inMemory.v;
    geneInfoMemoryCache.delete(symbolKey);
  }

  const stored = readStoredEntry(symbolKey);
  if (stored && isEntryFresh(stored)) {
    geneInfoMemoryCache.set(symbolKey, stored);
    return stored.v;
  }

  const legacy = migrateLegacyEntry(geneSymbol);
  if (legacy) return rememberGeneInfo(symbolKey, legacy);

  return undefined;
};

/**
 * Gene info with caching and request de-duplication.
 * Always resolves (never rejects): parsed info object, or null when unavailable.
 * "Gene unknown" (HTTP 404) is cached; network failures are not.
 */
export const getGeneInfo = (geneSymbol) => {
  const symbolKey = cacheKeyFor(geneSymbol);
  if (!symbolKey) return Promise.resolve(null);

  const cached = getCachedGeneInfo(geneSymbol);
  if (cached !== undefined) return Promise.resolve(cached);

  if (geneInfoInFlight.has(symbolKey)) return geneInfoInFlight.get(symbolKey);

  const request = fetch(
    `${HARMONIZOME_GENE_URL}${encodeURIComponent(cleanGeneSymbol(geneSymbol))}`
  )
    .then((response) => {
      if (response.status === 404) {
        // Harmonizome does not know this symbol (controls, novel transcripts).
        return rememberGeneInfo(symbolKey, null);
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text().then((content) => {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          parsed = { description: content };
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          parsed = { description: String(content) };
        }
        // Harmonizome answers unknown symbols with HTTP 200 and a body such as
        // {"status":400,"message":"Bad request."}: cache that as "no info".
        if (!parsed.symbol && typeof parsed.status === "number" && parsed.status >= 400) {
          return rememberGeneInfo(symbolKey, null);
        }
        return rememberGeneInfo(symbolKey, parsed);
      });
    })
    .catch((error) => {
      console.error(`Failed to fetch gene info for ${geneSymbol}:`, error);
      return null; // transient failure: not cached, retried on the next hover
    })
    .finally(() => {
      geneInfoInFlight.delete(symbolKey);
    });

  geneInfoInFlight.set(symbolKey, request);
  return request;
};

/**
 * Tooltip for charts that show a gene with one or more scores
 * (gene signature, expression analyzer). All values are HTML-escaped.
 *
 * @param {object} options
 * @param {string} options.geneSymbol
 * @param {object|null} options.geneInfo   Harmonizome info (name, description)
 * @param {{label:string, value:any, color?:string, bold?:boolean}[]} options.rows
 * @param {boolean} options.highlighted
 * @param {"ready"|"loading"} options.state
 */
export const buildGeneScoreTooltip = ({
  geneSymbol,
  geneInfo = null,
  rows = [],
  highlighted = false,
  state = "ready",
}) => {
  let html = `<div style="line-height:1.4;font-weight:600;color:#1976d2;font-size:14px;margin:0 0 8px 0;padding:0;">${escapeHtml(geneSymbol)}${
    geneInfo?.name ? ` (${escapeHtml(geneInfo.name)})` : ""
  }</div>`;

  rows.forEach((row) => {
    if (!row || row.value === undefined || row.value === null || row.value === "") return;
    const color = /^#[0-9a-fA-F]{3,8}$/.test(String(row.color || "")) ? row.color : "#555";
    html += `<div style="font-size:12px;color:${color};margin:4px 0;padding:0;${
      row.bold ? "font-weight:500;" : ""
    }"><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</div>`;
  });

  if (highlighted) {
    html += `<div style="font-size:11px;color:#ff9800;margin:4px 0;padding:0;"><strong>★ Highlighted Gene</strong></div>`;
  }

  if (state === "loading") {
    html += `<div style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0 0;padding:0;">Loading gene information...</div>`;
  } else if (geneInfo?.description) {
    html += `<div style="font-size:11px;color:#444;margin:8px 0 0 0;padding:0;line-height:1.3;word-wrap:break-word;max-width:350px;">${escapeHtml(geneInfo.description)}</div>`;
  }

  return html;
};

/**
 * Formats gene information for tooltip display
 * @param {string} geneSymbol - The gene symbol
 * @param {object} geneInfo - The gene information object
 * @param {object} additionalInfo - Additional information to include (cluster, probability, etc.)
 * @returns {string} - Formatted HTML string for tooltip (all values HTML-escaped)
 */
export const formatGeneTooltip = (geneSymbol, geneInfo, additionalInfo = {}) => {
  const { cluster, clusterProb, geneType, knockdown, neighbourCount, cellLine } = additionalInfo;

  // Compact tooltip optimized for ECharts container
  let tooltipContent = `<div style="line-height:1.0;font-weight:600;color:#1976d2;font-size:13px;margin:0 0 3px 0;padding:0;">${escapeHtml(cleanGeneSymbol(geneSymbol))}${geneInfo?.name ? ` (${escapeHtml(geneInfo.name)})` : ''}</div>`;

  // Add cell line information if available
  if (cellLine !== undefined) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Cell Line:</strong> ${escapeHtml(cellLine)}</div>`;
  }

  // Add cluster information if available
  if (cluster !== undefined) {
    const clusterNumber = Number(cluster);
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Cluster:</strong> ${Number.isFinite(clusterNumber) && clusterNumber >= 0 ? `Cluster ${clusterNumber + 1}` : 'Unclustered'}`;
    const probability = Number(clusterProb);
    if (clusterProb !== undefined && clusterProb !== null && Number.isFinite(probability)) {
      tooltipContent += ` | <strong>Probability:</strong> ${(probability * 100).toFixed(1)}%`;
    }
    tooltipContent += `</div>`;
  }

  // Add gene type information if available
  if (geneType) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Type:</strong> ${escapeHtml(geneType)}</div>`;
  }

  // Add knockdown information if available
  if (knockdown) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Knockdown:</strong> ${escapeHtml(knockdown)}</div>`;
  }

  // Add neighbour count if available
  if (neighbourCount !== undefined) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Neighbours:</strong> ${escapeHtml(neighbourCount)}</div>`;
  }

  // Add gene description
  if (geneInfo?.description) {
    tooltipContent += `<div style="font-size:11px;color:#444;margin:6px 0 0 0;padding:0;line-height:1.3;word-wrap:break-word;max-width:320px;">${escapeHtml(geneInfo.description)}</div>`;
  } else {
    tooltipContent += `<div style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0 0;padding:0;">Gene information not available</div>`;
  }

  return tooltipContent;
};

/**
 * Creates a tooltip formatter function for ECharts
 * @param {object} options - Options for the formatter
 * @param {boolean} options.useCache - Whether to use the gene-info cache
 * @param {function} options.parseData - Function to parse data from params
 * @param {function} options.renderTooltip - Optional (geneSymbol, geneInfo, parsed, state) => html.
 *   `state` is "ready" or "loading". Defaults to formatGeneTooltip.
 * @returns {function} - ECharts tooltip formatter function
 */
export const createGeneTooltipFormatter = (options = {}) => {
  const {
    useCache = true,
    parseData = (params) => ({ geneSymbol: params.data[3] }),
    renderTooltip,
  } = options;

  const render = (geneSymbol, geneInfo, parsed, state) => {
    if (typeof renderTooltip === "function") {
      return renderTooltip(geneSymbol, geneInfo, parsed, state);
    }
    if (state === "loading") {
      return `<div style="text-align: center; color: #666;">
      <div style="margin-bottom: 8px;">Loading gene information...</div>
      <div style="font-size: 12px;">${escapeHtml(geneSymbol)}</div>
    </div>`;
    }
    return formatGeneTooltip(geneSymbol, geneInfo, parsed);
  };

  return function(params, ticket, callback) {
    const parsed = parseData(params) || {};
    const geneSymbol = parsed.geneSymbol;
    if (geneSymbol === undefined || geneSymbol === null || geneSymbol === "") return "";
    const symbol = String(geneSymbol);

    // Check cache first
    if (useCache) {
      const cached = getCachedGeneInfo(symbol);
      if (cached !== undefined) {
        return render(symbol, cached, parsed, "ready");
      }
    }

    // Fetch (cached + de-duplicated); never rejects.
    const lookup = useCache
      ? getGeneInfo(symbol)
      : fetchGeneInfo(symbol).then((content) => {
          if (!content) return null;
          try {
            return typeof content === 'string' ? JSON.parse(content) : content;
          } catch (e) {
            return { description: content };
          }
        });

    lookup
      .then((info) => {
        if (typeof callback === "function") callback(ticket, render(symbol, info, parsed, "ready"));
      })
      .catch((error) => {
        console.error('Error fetching gene info:', error);
        if (typeof callback === "function") callback(ticket, render(symbol, null, parsed, "ready"));
      });

    // Return loading message
    return render(symbol, null, parsed, "loading");
  };
};
