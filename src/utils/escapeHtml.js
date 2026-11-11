/**
 * Escape a value for safe interpolation into an HTML string
 * (ECharts tooltip formatters, innerHTML tooltips, ...).
 *
 * null/undefined become an empty string; everything else is stringified first.
 */
const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch]);
};

export default escapeHtml;
