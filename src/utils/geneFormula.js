/**
 * Client-side parsing of gene-signature formulas and gene lists.
 *
 * Rules (kept in one place so every component agrees):
 *  - "+", ",", ";" and whitespace separate terms (addition).
 *  - "-" is the subtraction operator when it starts a term or has whitespace
 *    on either side ("A - B", "A -B", "-B").
 *  - A tight "-" between two symbol characters ("HLA-A", "ATF4-DDIT3") is
 *    ambiguous. It is kept inside the symbol when the joined token is a known
 *    symbol (options.knownSymbols) or looks like an HGNC hyphenated symbol
 *    (HLA-A, MT-ND1, NKX2-1, IGHV3-23, FOXD3-AS1, ...); otherwise it is a minus.
 */

const HYPHENATED_SYMBOL_PATTERNS = [
  // Families whose stem is not a gene on its own
  // (an optional second segment must itself be a number or a transcript suffix,
  // so "MT-ND1-NKX2-1" is MT-ND1 minus NKX2-1, not one symbol)
  /^(?:HLA|MT|LINC|ERV[A-Z0-9]*)-[A-Z0-9]+(?:-(?:\d+[A-Z]?|AS\d*|DT|IT\d*|OT\d*))?$/i,
  // Numbered family members: NKX2-1, IGHV3-23, KRTAP4-1, MIR124-1, ERVK-6
  /^[A-Z][A-Z0-9.]*-\d+[A-Z]?$/i,
  // Antisense / divergent / intronic / overlapping transcripts
  /^[A-Z][A-Z0-9.]*(?:-\d+)?-(?:AS\d*|DT|IT\d*|OT\d*)$/i,
];

const isSeparator = (ch) =>
  ch === "+" || ch === "," || ch === ";" || /\s/.test(ch);

const toSymbolSet = (knownSymbols) => {
  if (!knownSymbols) return null;
  const out = new Set();
  for (const s of knownSymbols) {
    if (s !== null && s !== undefined) out.add(String(s).toUpperCase());
  }
  return out;
};

export const isLikelyHyphenatedSymbol = (token, knownSymbols) => {
  if (!token || token.indexOf("-") < 1) return false;
  const known = knownSymbols instanceof Set ? knownSymbols : toSymbolSet(knownSymbols);
  if (known && known.has(String(token).toUpperCase())) return true;
  return HYPHENATED_SYMBOL_PATTERNS.some((re) => re.test(token));
};

/**
 * Parse a formula / gene list into signed terms.
 * @returns {{gene: string, sign: 1|-1, op: "+"|"-"|null}[]}
 *   `op` is the operator that was explicitly typed in front of the term (or null).
 */
export const parseGeneFormula = (formula, options = {}) => {
  const text = String(formula ?? "");
  const known = toSymbolSet(options.knownSymbols);
  const terms = [];

  let buffer = "";
  let sign = 1;
  let op = null;

  const flush = () => {
    if (buffer) terms.push({ gene: buffer, sign, op });
    buffer = "";
    sign = 1;
    op = null;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "-") {
      const prev = i > 0 ? text[i - 1] : "";
      const next = i + 1 < text.length ? text[i + 1] : "";
      const tight = buffer && prev && !isSeparator(prev) && next && !isSeparator(next) && next !== "-";

      if (tight) {
        // Look ahead to the end of the candidate hyphenated symbol.
        let j = i + 1;
        while (j < text.length && !isSeparator(text[j]) && text[j] !== "-") j++;
        let candidate = `${buffer}-${text.slice(i + 1, j)}`;
        let end = j;
        // Allow one more hyphenated segment (e.g. HLA-DRB1-AS1).
        if (text[j] === "-" && j + 1 < text.length && !isSeparator(text[j + 1])) {
          let k = j + 1;
          while (k < text.length && !isSeparator(text[k]) && text[k] !== "-") k++;
          const longer = `${candidate}-${text.slice(j + 1, k)}`;
          if (isLikelyHyphenatedSymbol(longer, known)) {
            candidate = longer;
            end = k;
          }
        }
        if (isLikelyHyphenatedSymbol(candidate, known)) {
          buffer = candidate;
          i = end - 1;
          continue;
        }
      }

      flush();
      sign = -1;
      op = "-";
      continue;
    }

    if (ch === "+") {
      flush();
      sign = 1;
      op = "+";
      continue;
    }

    if (isSeparator(ch)) {
      // Whitespace / comma / semicolon: ends a term but keeps a pending operator
      // ("A - B" => the minus still applies to B).
      if (buffer) flush();
      continue;
    }

    buffer += ch;
  }
  flush();

  return terms;
};

/** Gene symbols of a formula, in order, without signs. */
export const formulaGeneSymbols = (formula, options = {}) =>
  parseGeneFormula(formula, options).map((t) => t.gene);

const stripGuideSuffix = (gene) => String(gene || "").split("_")[0];

/**
 * Upper-cased set of every symbol a formula may refer to. Because a tight hyphen
 * is ambiguous, both readings are included ("HLA-A" and "ATF4-DDIT3" yield
 * HLA-A, ATF4-DDIT3, ATF4, DDIT3, HLA, A), so highlight / "Included" checks
 * stay correct whichever way the server resolves the formula.
 */
export const formulaSymbolSet = (formula, options = {}) => {
  const out = new Set();
  parseGeneFormula(formula, options).forEach(({ gene }) => {
    const clean = stripGuideSuffix(gene).toUpperCase();
    if (clean) out.add(clean);
  });
  // Second reading: every hyphen is an operator.
  String(formula ?? "")
    .split(/[+\-,;\s]+/)
    .filter(Boolean)
    .forEach((g) => out.add(stripGuideSuffix(g).toUpperCase()));
  return out;
};

export const formulaHasGene = (formula, gene, options = {}) => {
  const target = stripGuideSuffix(gene).toUpperCase();
  if (!target) return false;
  return parseGeneFormula(formula, options).some(
    ({ gene: g }) => stripGuideSuffix(g).toUpperCase() === target
  );
};

/** Serialise terms back to a compact formula ("A+B-C"). */
export const serializeGeneFormula = (terms) =>
  terms
    .map((t, idx) => {
      if (t.sign < 0) return `-${t.gene}`;
      return idx === 0 ? t.gene : `+${t.gene}`;
    })
    .join("");

/** Add the gene (as an addition) or remove it if already present. */
export const toggleGeneInFormula = (formula, gene, options = {}) => {
  const clean = stripGuideSuffix(gene);
  if (!clean) return String(formula ?? "");
  const target = clean.toUpperCase();
  const terms = parseGeneFormula(formula, options);
  const exists = terms.some((t) => stripGuideSuffix(t.gene).toUpperCase() === target);
  const next = exists
    ? terms.filter((t) => stripGuideSuffix(t.gene).toUpperCase() !== target)
    : [...terms, { gene: clean, sign: 1, op: "+" }];
  return serializeGeneFormula(next);
};
