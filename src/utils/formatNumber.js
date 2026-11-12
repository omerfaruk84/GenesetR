/**
 * Consistent number display for result tables.
 *
 * - integers are shown as they are (ranks, counts)
 * - very small or very large values use scientific notation (p-values)
 * - everything else is shown with three significant decimals at most
 *
 * Only for display: sorting, filtering and exports keep the raw values.
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "number") return value;
  if (Number.isNaN(value)) return "n/a";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
  if (Number.isInteger(value)) return String(value);

  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 1e-3 || magnitude >= 1e6)) {
    return value.toExponential(2);
  }
  if (magnitude >= 100) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  return value.toFixed(3);
};

export default formatNumber;
