/* eslint-disable */
// Resilient idb-keyval wrapper. Mirrors writes to an in-memory Map and
// attempts one-shot recovery (deleteDatabase) when IDB throws. Use this
// instead of importing directly from "idb-keyval" for data that must survive
// a corrupted keyval-store (e.g. UnknownError: Internal error on Windows).
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

const memStore = new Map();
let recoveryAttempted = false;

const isDev = typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production";
const logErr = (...a) => { if (isDev) console.error(...a); };

const recoverOnce = async (sourceError) => {
  if (recoveryAttempted) return false;
  recoveryAttempted = true;
  if (typeof indexedDB === "undefined" || !indexedDB.deleteDatabase) return false;
  logErr("safeIdb: attempting one-shot recovery due to:", sourceError);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase("keyval-store");
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => { logErr("safeIdb: deleteDatabase blocked — using in-memory fallback"); resolve(false); };
    } catch (e) { resolve(false); }
  });
};

export const get = async (key) => {
  // Prefer memory (latest writes land here first, and it works when IDB is broken)
  if (memStore.has(key)) return memStore.get(key);
  try {
    return await idbGet(key);
  } catch (e) {
    logErr("safeIdb.get failed for", key, e);
    await recoverOnce(e);
    return undefined;
  }
};

export const set = async (key, value) => {
  memStore.set(key, value);
  try {
    await idbSet(key, value);
  } catch (e) {
    logErr("safeIdb.set failed for", key, e);
    await recoverOnce(e);
  }
};

export const del = async (key) => {
  memStore.delete(key);
  try {
    await idbDel(key);
  } catch (e) {
    logErr("safeIdb.del failed for", key, e);
    await recoverOnce(e);
  }
};
