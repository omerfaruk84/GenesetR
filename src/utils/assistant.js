/**
 * "Ask GeneSetR": questions in plain language, answered by an AI model from
 * GeneSetR's tables (`/api/v1/assistant`). Pure helpers of the page: the
 * limits of a conversation, and what each look-up of an answer read and which
 * page of the app shows the same data.
 */
import { ROUTES } from "../common/routes";
import { atlasPath, libraryName } from "./atlas";
import { genePagePath } from "./geneLinks";
import { integratedPath } from "./integrated";
import { interactionsPath } from "./interactions";
import { MIN_SIGNATURE_GENES, tfRegulatorsPath } from "./regulators";

/** Limits of the API: messages per conversation and characters per message. */
export const MAX_MESSAGES = 20;
export const MAX_CHARS = 4000;
/** Questions that fit in one conversation (a question and its answer are two messages). */
export const MAX_QUESTIONS = MAX_MESSAGES / 2;

export const EXAMPLE_QUESTIONS = [
  "What does loss of KEAP1 do across cell types?",
  "Which knock-downs lower the interferon alpha response?",
  "What might C1orf159 do?",
  "Do CBL and CNN1 interact?",
  "Which transcription factors switch on LDHA?",
];

/** Questions already asked in a conversation (messages of the user). */
export const questionsAsked = (messages) => (messages || []).filter((message) => message.role === "user").length;

/** Why a question cannot be sent, or "" when it can. */
export const questionProblem = (text, messages = []) => {
  const question = String(text || "").trim();
  if (!question) return "Type a question.";
  if (question.length > MAX_CHARS) return `A question can have at most ${MAX_CHARS.toLocaleString("en-US")} characters.`;
  if ((messages || []).length + 1 > MAX_MESSAGES) return `A conversation can have ${MAX_QUESTIONS} questions. Start a new one.`;
  return "";
};

const cut = (text) => {
  const value = String(text || "").trim();
  return value.length > MAX_CHARS ? `${value.slice(0, MAX_CHARS - 1)}…` : value;
};

/**
 * The messages to send: the conversation so far plus the new question, as
 * { role, content }. Long answers are cut to the length the API accepts.
 */
export const conversationPayload = (messages, question) =>
  [...(messages || []), { role: "user", content: question }]
    .filter((message) => (message.role === "user" || message.role === "assistant") && String(message.content || "").trim())
    .map((message) => ({ role: message.role, content: cut(message.content) }));

/** Text for a failed question, from the HTTP status and the message of the API. */
export const askErrorMessage = ({ status, message, retryAfter } = {}) => {
  if (status === 429) {
    const minutes = Number(retryAfter) > 0 ? Math.ceil(Number(retryAfter) / 60) : 0;
    return `Too many questions were asked from your address. ${minutes > 0 ? `Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` : "Try again later."}`;
  }
  if (status === 503) return message || "The assistant is not available right now. Try again later.";
  if (status === 400) return message || "The question could not be read. Start a new conversation.";
  if (!status) return "The server could not be reached. Check your connection and ask again.";
  return "The question could not be answered because of an error on the server. Try again later.";
};

/** Address of the MCP endpoint of an API (`SERVER_ADDRESS` of store/api/config). */
export const mcpAddress = (serverAddress) => `${String(serverAddress || "").replace(/\/+$/, "")}/mcp`;

const list = (value) => {
  const items = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/);
  return items.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
};
const symbol = (value) => String(value ?? "").trim().toUpperCase();
const shortList = (genes, limit = 6) => {
  const all = list(genes);
  return all.length > limit ? `${all.slice(0, limit).join(", ")} and ${all.length - limit} more` : all.join(", ");
};

/**
 * What one look-up was asked, in words: "ATF4", "ATF4 in K562gwps",
 * "“interferon alpha” in Hallmark", "CBL + CNN1", "up: A, B; down: C".
 */
export const sourceInput = (source) => {
  const input = source?.input && typeof source.input === "object" ? source.input : {};
  const parts = [];
  if (input.gene_a) parts.push(input.gene_b ? `${symbol(input.gene_a)} + ${symbol(input.gene_b)}` : `pairs of ${symbol(input.gene_a)}`);
  if (input.gene) parts.push(symbol(input.gene));
  if (input.pathway) parts.push(`“${String(input.pathway).trim()}”`);
  if (list(input.up).length > 0) parts.push(`up: ${shortList(input.up)}`);
  if (list(input.down).length > 0) parts.push(`down: ${shortList(input.down)}`);
  if (list(input.perturbations).length > 0) parts.push(shortList(input.perturbations));
  if (list(input.genes).length > 0) parts.push(shortList(input.genes));
  let text = parts.join("; ");
  if (input.dataset) text += `${text ? " in " : ""}${String(input.dataset).trim()}`;
  if (input.library) text += `${text ? ", " : ""}${libraryName(input.library)}`;
  // anything the tools get that is not named above, so that nothing asked stays hidden
  const known = ["gene", "gene_a", "gene_b", "pathway", "up", "down", "perturbations", "genes", "dataset", "library", "top_n"];
  const others = Object.keys(input)
    .filter((key) => !known.includes(key))
    .map((key) => `${key}: ${typeof input[key] === "object" ? JSON.stringify(input[key]) : input[key]}`);
  if (others.length > 0) text += `${text ? "; " : ""}${others.join("; ")}`;
  return text;
};

/**
 * The page of the app that shows the data of a look-up: { to, label }, or
 * null when no page does or the look-up failed.
 */
export const sourceLink = (source) => {
  if (!source || source.ok === false) return null;
  const input = source.input && typeof source.input === "object" ? source.input : {};
  const gene = symbol(input.gene);
  switch (source.tool) {
    case "data_overview":
      return { to: ROUTES.DATASETS, label: "Datasets" };
    case "consensus_effects":
    case "knockdown_profile":
      return gene ? { to: integratedPath({ mode: "gene", symbol: gene }), label: `Integrated analysis: ${gene}` } : null;
    case "consensus_regulators":
      return gene ? { to: integratedPath({ mode: "gene", symbol: gene, view: "measured" }), label: `Integrated analysis: what controls ${gene}` } : null;
    case "signature_perturbations": {
      const up = list(input.up);
      const down = list(input.down);
      return up.length + down.length >= MIN_SIGNATURE_GENES
        ? { to: integratedPath({ mode: "signature", up, down, run: true }), label: "Integrated analysis: signature" }
        : null;
    }
    case "common_effects": {
      const genes = list(input.perturbations);
      return genes.length >= 2 ? { to: integratedPath({ mode: "set", genes, run: true }), label: "Integrated analysis: common effects" } : null;
    }
    case "gene_function":
      return gene ? { to: atlasPath({ tab: "map", gene }), label: `Function atlas: ${gene}` } : null;
    case "pathway_perturbations":
      return { to: atlasPath({ tab: "pathways", library: input.library || "" }), label: "Function atlas: Pathways" };
    case "perturbation_pathways":
      return gene
        ? { to: atlasPath({ tab: "pathways", by: "gene", pert: gene, library: input.library || "" }), label: `Function atlas: pathways that ${gene} moves` }
        : null;
    case "tf_regulators": {
      // the TF regulators page takes a gene set; for one gene the same table is on its gene page
      if (gene) return { to: genePagePath(gene), label: `Gene page of ${gene}: TF regulators` };
      const up = list(input.up);
      const down = list(input.down);
      return up.length + down.length >= MIN_SIGNATURE_GENES ? { to: tfRegulatorsPath({ up, down, run: true }), label: "TF regulators" } : null;
    }
    case "genetic_interaction": {
      const a = symbol(input.gene_a);
      const b = symbol(input.gene_b);
      if (a && b) return { to: interactionsPath({ a, b }), label: `Genetic interactions: ${a} + ${b}` };
      return a ? { to: interactionsPath({ q: a }), label: `Genetic interactions: pairs of ${a}` } : null;
    }
    default:
      return null;
  }
};
