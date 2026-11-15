import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/assistant`;

/**
 * Whether the assistant can be used on this server:
 * { enabled: false, reason } or { enabled: true, model, tools: [{ name, title }] }.
 * Never rejects: a server that cannot be reached counts as not enabled
 * (`unreachable: true`).
 */
export const fetchAssistantStatus = async ({ signal } = {}) => {
  try {
    const response = await Axios.get(`${BASE}/status`, { signal });
    return response.data && typeof response.data === "object" ? response.data : { enabled: false, reason: "" };
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    return { enabled: false, unreachable: !error?.response, reason: error?.response ? "" : "The server could not be reached." };
  }
};

/**
 * Ask the last question of a conversation (`messages`: [{ role, content }]).
 * Resolves to { answer (Markdown), note, sources: [{ tool, title, input, ok, error? }], stopReason, model, usage, steps }.
 * Rejects with an Error that carries `status` (HTTP status, 0 when the server
 * was not reached), `apiMessage` (the message of the API, safe to show) and
 * `retryAfter` (seconds, for 429).
 */
export const askAssistant = async (messages, { signal } = {}) => {
  try {
    const response = await Axios.post(BASE, { messages }, { signal });
    return response.data;
  } catch (error) {
    if (Axios.isCancel(error)) throw error;
    const body = error?.response?.data?.error || {};
    const failure = new Error(body.message || error?.message || "The question could not be answered");
    failure.status = error?.response?.status || 0;
    failure.apiMessage = body.message || "";
    failure.retryAfter = body.details?.retry_after || Number(error?.response?.headers?.["retry-after"]) || 0;
    throw failure;
  }
};
