/**
 * Overlaps between gene lists: membership, pairwise similarity and the
 * significance of an overlap. Used by the gene list comparison page.
 *
 * Lists are compared by gene symbol. A saved list may be a signature formula
 * ("A+B-C"); its signs are dropped here, so "-C" in a signature and "C" in a
 * plain list count as the same gene.
 */
import { parseGeneFormula } from "./geneFormula";

/** Default size of the gene universe (approximate number of protein-coding genes). */
export const DEFAULT_BACKGROUND = 20000;

/** Unique upper-case symbols of a saved list (array, newline list or formula). */
export const listGenes = (genes) => {
  const text = Array.isArray(genes) ? genes.join("\n") : String(genes || "");
  if (!text.trim()) return [];
  const seen = new Set();
  const out = [];
  parseGeneFormula(text).forEach((term) => {
    const symbol = String(term.gene || "").trim().toUpperCase();
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      out.push(symbol);
    }
  });
  return out;
};

/**
 * Elements for UpSet/Venn plots: one entry per gene with the names of the
 * lists that contain it. `lists`: [{ name, genes: string[] }].
 */
export const buildMembership = (lists) => {
  const byGene = new Map();
  (lists || []).forEach((list) => {
    (list.genes || []).forEach((gene) => {
      if (!byGene.has(gene)) byGene.set(gene, []);
      const sets = byGene.get(gene);
      if (!sets.includes(list.name)) sets.push(list.name);
    });
  });
  return [...byGene.entries()].map(([name, sets]) => ({ name, sets }));
};

// log(n!) with a growing cache; exact sums keep tail probabilities accurate
const logFactCache = [0];
const logFactorial = (n) => {
  for (let i = logFactCache.length; i <= n; i += 1) logFactCache[i] = logFactCache[i - 1] + Math.log(i);
  return logFactCache[n];
};
const logChoose = (n, k) => (k < 0 || k > n ? -Infinity : logFactorial(n) - logFactorial(k) - logFactorial(n - k));

/**
 * One-sided hypergeometric test: P(X >= k) for X ~ Hypergeom(N, K, n),
 * i.e. the chance that two random lists of sizes K and n drawn from N genes
 * share at least k genes.
 */
export const hypergeomSf = (k, N, K, n) => {
  if (![k, N, K, n].every(Number.isFinite) || N <= 0) return NaN;
  const hi = Math.min(K, n);
  const lo = Math.max(0, n + K - N);
  if (k <= lo) return 1;
  if (k > hi) return 0;
  const denom = logChoose(N, n);
  // Sum in log space from the largest term down, for numerical stability
  const logs = [];
  for (let i = k; i <= hi; i += 1) logs.push(logChoose(K, i) + logChoose(N - K, n - i) - denom);
  const max = Math.max(...logs);
  const sum = logs.reduce((acc, value) => acc + Math.exp(value - max), 0);
  return Math.min(1, Math.exp(max) * sum);
};

/** Benjamini-Hochberg adjusted p-values, in the input order. */
export const adjustBH = (pValues) => {
  const indexed = pValues.map((p, i) => ({ p, i })).filter(({ p }) => Number.isFinite(p));
  indexed.sort((a, b) => b.p - a.p);
  const m = indexed.length;
  const out = pValues.map(() => NaN);
  let running = 1;
  indexed.forEach(({ p, i }, rank) => {
    running = Math.min(running, (p * m) / (m - rank));
    out[i] = running;
  });
  return out;
};

/**
 * Similarity and overlap significance for every pair of lists.
 * `background` is the size of the gene universe; it is raised to the size of
 * the union of all lists when smaller.
 * Returns { background, pairs: [{ a, b, sizeA, sizeB, overlap, jaccard,
 * overlapCoefficient, expected, foldEnrichment, pValue, qValue, genes }] }.
 */
export const pairwiseOverlaps = (lists, background = DEFAULT_BACKGROUND) => {
  const sets = (lists || []).map((list) => ({ name: list.name, set: new Set(list.genes || []) }));
  const union = new Set();
  sets.forEach(({ set }) => set.forEach((g) => union.add(g)));
  const N = Math.max(Number(background) || 0, union.size, 1);
  const pairs = [];
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const A = sets[i];
      const B = sets[j];
      const genes = [...A.set].filter((g) => B.set.has(g));
      const overlap = genes.length;
      const unionSize = A.set.size + B.set.size - overlap;
      const expected = (A.set.size * B.set.size) / N;
      pairs.push({
        a: A.name,
        b: B.name,
        sizeA: A.set.size,
        sizeB: B.set.size,
        overlap,
        jaccard: unionSize ? overlap / unionSize : 0,
        overlapCoefficient: Math.min(A.set.size, B.set.size) ? overlap / Math.min(A.set.size, B.set.size) : 0,
        expected,
        foldEnrichment: expected > 0 ? overlap / expected : NaN,
        pValue: hypergeomSf(overlap, N, A.set.size, B.set.size),
        genes: genes.sort(),
      });
    }
  }
  const q = adjustBH(pairs.map((pair) => pair.pValue));
  pairs.forEach((pair, index) => {
    pair.qValue = q[index];
  });
  return { background: N, pairs };
};

/**
 * Gene × list presence table: one row per gene, sorted by the number of lists
 * that contain it (most shared first), then by symbol.
 */
export const membershipRows = (lists) => {
  const names = (lists || []).map((list) => list.name);
  const sets = (lists || []).map((list) => new Set(list.genes || []));
  return buildMembership(lists)
    .map(({ name }) => {
      const row = { Gene: name, Lists: 0 };
      names.forEach((listName, index) => {
        const present = sets[index].has(name);
        row[listName] = present ? 1 : 0;
        if (present) row.Lists += 1;
      });
      return row;
    })
    .sort((a, b) => b.Lists - a.Lists || a.Gene.localeCompare(b.Gene));
};

/** Readable label of an UpSet/Venn combination ("A ∩ B", "only A"). */
export const describeCombination = (combination, allSetNames = []) => {
  if (!combination) return "";
  const names = combination.sets ? [...combination.sets].map((s) => s.name) : [];
  if (names.length === 0) return combination.name || "Selection";
  const op = combination.type === "union" ? " ∪ " : " ∩ ";
  const joined = names.join(op);
  if (combination.type === "distinctIntersection" && names.length < allSetNames.length) {
    return names.length === 1 ? `Only in ${joined}` : `${joined} (only)`;
  }
  return joined;
};

/** Short p-value text: "< 1e-300", "3.2e-12", "0.041". */
export const formatP = (p) => {
  if (!Number.isFinite(p)) return "–";
  if (p === 0) return "< 1e-300";
  if (p < 0.001) return p.toExponential(1);
  return p < 0.1 ? p.toFixed(3) : p.toFixed(2);
};
