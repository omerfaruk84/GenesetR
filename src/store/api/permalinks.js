import Axios from "axios";
import { SERVER_ADDRESS, API_V1_PREFIX } from "./config";

const BASE = `${SERVER_ADDRESS}${API_V1_PREFIX}/permalinks`;

const fail = (error, fallback) => {
  const wrapped = new Error(error?.response?.data?.error?.message || error?.message || fallback);
  wrapped.notFound = error?.response?.status === 404;
  return wrapped;
};

/** Store a page and its settings snapshot; resolves to the permalink id. */
export const createPermalink = async (route, state) => {
  try {
    const response = await Axios.post(BASE, { route, state });
    return response.data.id;
  } catch (error) {
    throw fail(error, "The link could not be created");
  }
};

/** Resolves to { id, route, state, created_at }. */
export const readPermalink = async (id) => {
  try {
    const response = await Axios.get(`${BASE}/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error) {
    throw fail(error, "The link could not be opened");
  }
};

/** Address of a permalink on this site. */
export const permalinkUrl = (id) => `${window.location.origin}/r?id=${encodeURIComponent(id)}`;
