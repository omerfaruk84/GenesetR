/**
 * Text the user can copy to reproduce or cite an analysis: the request as a
 * curl command or a Python script, and a methods paragraph.
 */
import { SERVER_ADDRESS } from "../store/api/config";

export const APP_VERSION = "2.0.0";
export const SITE_URL = "https://genesetr.uio.no";
export const GENESETR_CITATION =
  "Kuzu OF, Saatcioglu F. GeneSetR: A web server for gene set analysis based on genome-wide Perturb-Seq data. bioRxiv 2023. doi:10.1101/2023.09.18.558211";

// In development the page talks to a local server; snippets should still
// point at an address other people can reach.
const apiBase = () => (/localhost|127\.0\.0\.1/.test(SERVER_ADDRESS) ? `${SITE_URL}/api` : SERVER_ADDRESS);

/** The request as a curl command (bash). Poll /tasks/<task_id> for the result. */
export const curlSnippet = (payload) => {
  const body = JSON.stringify({ body: JSON.stringify(payload) }).replace(/'/g, "'\\''");
  return [
    "# Start the analysis; the answer holds a task_id",
    `curl -s -X POST "${apiBase()}/getData" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${body}'`,
    "",
    "# Fetch the result when status is SUCCESS",
    `curl -s "${apiBase()}/tasks/<task_id>"`,
  ].join("\n");
};

/** The request as a small Python script that waits for the result. */
export const pythonSnippet = (payload) =>
  [
    "import json",
    "import time",
    "",
    "import requests",
    "",
    `BASE = "${apiBase()}"`,
    "",
    `payload = json.loads(r'''${JSON.stringify(payload, null, 2)}''')`,
    "",
    'task_id = requests.post(f"{BASE}/getData", json={"body": json.dumps(payload)}, timeout=60).json()["task_id"]',
    "",
    "while True:",
    '    status = requests.get(f"{BASE}/tasks/{task_id}", timeout=60).json()',
    '    if status["status"] in ("SUCCESS", "FAILURE", "REVOKED"):',
    "        break",
    "    time.sleep(1)",
    "",
    'if status["status"] != "SUCCESS":',
    '    raise RuntimeError(status.get("task_result"))',
    'result = status["task_result"]  # usually a JSON string: json.loads(result)',
    "print(str(result)[:500])",
  ].join("\n");

const describeValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/**
 * Methods text for an analysis.
 *   analysis: label of the module ("Correlation")
 *   datasets: registry entries used ({ id, name, citation })
 *   parameters: plain object of settings (gene lists are summarised by size)
 */
export const methodsText = ({ analysis, datasets = [], parameters = {}, link = null }) => {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `${analysis} analysis was performed with GeneSetR v${APP_VERSION} (${SITE_URL}) on ${today}.`,
    "",
    "Datasets:",
    ...(datasets.length > 0
      ? datasets.map((d) => `  - ${d.name || d.id} (${d.id})${d.citation ? `: ${d.citation}` : ""}`)
      : ["  - (none selected)"]),
    "",
    "Parameters:",
  ];
  Object.entries(parameters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    const text = describeValue(value);
    const isGeneList = typeof value === "string" && /[;\n]/.test(value) && text.length > 200;
    lines.push(
      isGeneList
        ? `  - ${key}: ${value.split(/[;\n]+/).filter(Boolean).length} genes`
        : `  - ${key}: ${text.length > 300 ? `${text.slice(0, 300)}…` : text}`
    );
  });
  if (link) lines.push("", `Link to this analysis: ${link}`);
  lines.push("", "Please cite:", `  ${GENESETR_CITATION}`);
  const citations = [...new Set(datasets.map((d) => d.citation).filter(Boolean))];
  citations.forEach((citation) => lines.push(`  ${citation}`));
  return lines.join("\n");
};

/** Copy text to the clipboard; resolves to true on success. */
export const copyText = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // fall through to the legacy way
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch (e) {
    return false;
  }
};
