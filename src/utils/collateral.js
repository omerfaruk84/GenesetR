/**
 * Collateral knock-downs: wording for the report of
 * GET /api/v1/integrated/perturbation/{symbol}/collateral
 * ({ suspects: [{ gene, kind: "neighbour" | "similar", minZ, datasets: [{ dataset, z }], score, distance }], reduced }).
 *
 * A suspect is a second gene whose mRNA falls under the knock-down and whose own loss could explain
 * the profile: the guide may silence it next to its target (shared promoter) or elsewhere in the genome.
 */

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "ATP6AP1 falls to z = -10.7 (2 data sets); its own knock-down looks the same (score 18.6)". */
export const suspectText = (suspect) => {
  if (!suspect) return "";
  const fall = `${suspect.gene} falls to z = ${Number(suspect.minZ).toFixed(1)} (${count((suspect.datasets || []).length, "data set")})`;
  if (suspect.kind === "neighbour") {
    const where = suspect.distance == null ? "within 5 kb" : `${Number(suspect.distance).toLocaleString("en-US")} bp away`;
    return `${fall}; its promoter lies ${where}`;
  }
  const score = suspect.score == null ? "" : ` (score ${Number(suspect.score).toFixed(1)})`;
  return `${fall}; its own knock-down looks the same${score}`;
};

/** The suspects worth showing, strongest first (the API already sorts them); at most `limit`. */
export const shownSuspects = (report, limit = 3) => ((report && report.suspects) || []).slice(0, limit);

/** One sentence for a tooltip or an export. Empty when the report has no suspect. */
export const collateralSummary = (symbol, report, limit = 3) => {
  const suspects = shownSuspects(report, limit);
  if (suspects.length === 0) return "";
  const more = ((report && report.suspects) || []).length - suspects.length;
  return `Guides against ${symbol} also lower ${suspects.map((s) => s.gene).join(", ")}${more > 0 ? ` and ${more} more` : ""}: the profile may belong to that gene.`;
};
