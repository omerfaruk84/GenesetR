/**
 * Single place for the backend address.
 *
 * Override at build time with REACT_APP_API_URL (e.g. in `.env.local`):
 *   REACT_APP_API_URL=https://staging.example.org/api
 *
 * Defaults: the production API for production builds, the local FastAPI server
 * (python main.py -> port 8443) for development.
 *
 * Note for production: the API application is mounted under `/api` and its
 * versioned routes carry their own `/api/v1` prefix, so they live at
 * `<SERVER_ADDRESS>/api/v1/...` (i.e. https://genesetr.uio.no/api/api/v1/...).
 */
export const isDevEnv = process.env.NODE_ENV !== "production";

const DEFAULT_SERVER_ADDRESS = isDevEnv
  ? "http://localhost:8443"
  : "https://genesetr.uio.no/api";

const configuredAddress = (process.env.REACT_APP_API_URL || "").trim();

// No trailing slash: paths are appended as `${SERVER_ADDRESS}/getData`
export const SERVER_ADDRESS = (configuredAddress || DEFAULT_SERVER_ADDRESS).replace(/\/+$/, "");

export const API_V1_PREFIX = "/api/v1";

/**
 * WebSocket endpoint for task updates. Built from the full base address (only
 * the scheme is swapped), so it follows the same mount point as the HTTP routes.
 */
export const getTaskWebSocketUrl = (taskId) =>
  `${SERVER_ADDRESS.replace(/^http/i, "ws")}${API_V1_PREFIX}/ws/tasks/${encodeURIComponent(taskId)}`;
