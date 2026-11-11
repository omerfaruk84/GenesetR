/**
 * WebSocket client for real-time task status updates.
 * Replaces polling with push notifications for better performance.
 *
 * Contract with the backend:
 *  - The socket always ends with a terminal message (`SUCCESS` with `result`,
 *    or `FAILURE` with `error`) and is then closed by the server.
 *  - A `FAILURE` is a real task failure (also used for unknown/expired and
 *    cancelled tasks) and must NOT be retried through polling.
 *  - Only transport problems (connection error, socket closed before a terminal
 *    message) fall back to HTTP polling.
 */
import Axios from "axios";
import { store } from "../store";
import { progressUpdateReceived } from "../results";

import { SERVER_ADDRESS, getTaskWebSocketUrl } from "./config";

// Circuit breaker: once a WebSocket connection failed at transport level (for
// example because the proxy does not forward upgrades) every later task of
// this page load uses HTTP polling directly, without another failing connect.
let webSocketUnavailable = false;

const REQUEST_HEADERS = {
  "ngrok-skip-browser-warning": "69420",
};

// Polling configuration
const POLL_INITIAL_DELAY_MS = 250;
const POLL_MAX_DELAY_MS = 2000;
const POLL_BACKOFF_FACTOR = 1.5;
const POLL_OVERALL_LIMIT_MS = 60 * 60 * 1000; // 60 minutes
const POLL_MAX_NOT_FOUND = 3; // 404s tolerated right after submission
const POLL_MAX_NETWORK_ERRORS = 5; // consecutive transient failures tolerated
const RATE_LIMIT_DEFAULT_WAIT_MS = 5000;
const RATE_LIMIT_MAX_WAIT_MS = 60000;

const TASK_GONE_MESSAGE =
  "This analysis is no longer available on the server - please run it again";

/**
 * Error used to settle a pending task promise when the user cancels it.
 * Callers should ignore it (check `error.cancelled` or `isTaskCancelledError`).
 */
export const createTaskCancelledError = (message = "Calculation cancelled") => {
  const error = new Error(message);
  error.name = "TaskCancelledError";
  error.cancelled = true;
  return error;
};

export const isTaskCancelledError = (error) =>
  !!error && (error.cancelled === true || error.name === "TaskCancelledError");

const createTaskFailedError = (message) => {
  const error = new Error(
    typeof message === "string" && message.length > 0 ? message : "Task failed"
  );
  error.name = "TaskFailedError";
  error.taskFailed = true;
  return error;
};

const toErrorMessage = (value, fallback = "Task failed") => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object") {
    if (typeof value.exc_message === "string") return value.exc_message;
    if (Array.isArray(value.exc_message)) return value.exc_message.join(" ");
    if (typeof value.message === "string") return value.message;
    try {
      return JSON.stringify(value);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
};

const dispatchProgress = (moduleName, message, percentage = null) => {
  if (!moduleName) return;
  store.dispatch(
    progressUpdateReceived({
      module: moduleName,
      message,
      percentage,
    })
  );
};

/**
 * Connect to WebSocket for task status updates.
 *
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {Function} onSuccess - Called with the result when the task succeeds
 * @param {Function} onError - Called with an Error. `error.taskFailed === true`
 *   means the task itself failed (terminal); otherwise it is a transport problem
 *   (`error.transport === true`) and the caller may fall back to polling.
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Function} Cancel function to close the connection (no callbacks fire afterwards)
 */
export const connectTaskWebSocket = (
  taskId,
  moduleName = null,
  onSuccess = null,
  onError = null,
  onProgress = null
) => {
  const wsUrl = getTaskWebSocketUrl(taskId);
  const ws = new WebSocket(wsUrl);
  // Set once a terminal outcome was reported (or the caller cancelled), so that
  // every connection reports exactly one outcome.
  let finished = false;

  const finish = (callback, value) => {
    if (finished) return;
    finished = true;
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch (_) {
      // no-op
    }
    if (callback) callback(value);
  };

  const transportError = (message) => {
    const error = new Error(message);
    error.transport = true;
    return error;
  };

  ws.onmessage = (event) => {
    if (finished) return;

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      finish(onError, transportError("Invalid message received from server"));
      return;
    }

    const status = data?.status;

    if (status === "SUCCESS") {
      finish(onSuccess, data.result);
    } else if (status === "FAILURE" || status === "REVOKED" || status === "ERROR") {
      // Terminal: the task itself failed / was cancelled / is unknown.
      finish(onError, createTaskFailedError(toErrorMessage(data.error ?? data.message)));
    } else if (status === "PROGRESS") {
      const message = data.message || "Processing...";
      const percentage = data.percentage ?? null;
      dispatchProgress(moduleName, message, percentage);
      if (onProgress) {
        onProgress({
          message,
          percentage,
          current: data.current,
          total: data.total,
        });
      }
    } else if (status === "PENDING") {
      dispatchProgress(moduleName, "Task queued, waiting to start...");
    } else if (status === "STARTED") {
      dispatchProgress(moduleName, "Task started...");
    }
    // Any other message (heartbeats, RECEIVED, RETRY, ...) only keeps the
    // connection alive and does not change what is displayed.
  };

  ws.onerror = () => {
    finish(onError, transportError("WebSocket connection error"));
  };

  ws.onclose = () => {
    // Closed without a terminal message: never leave the caller hanging.
    finish(onError, transportError("WebSocket closed before the task finished"));
  };

  // Return cancel function
  return () => {
    finished = true;
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch (_) {
      // no-op
    }
  };
};

const getActiveConnections = () => {
  if (typeof window === "undefined") return null;
  window.activeTaskConnections = window.activeTaskConnections || {};
  return window.activeTaskConnections;
};

/**
 * Wait for task completion using WebSocket (preferred) with polling fallback.
 *
 * The returned promise always settles:
 *  - resolves with the task result,
 *  - rejects with the task error (`error.taskFailed`),
 *  - rejects with a cancellation error (`error.cancelled`) when `cancelTask` is called,
 *  - rejects with a timeout / transport error when the result cannot be obtained.
 *
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {Object} options - Options object
 * @param {boolean} options.useWebSocket - Use WebSocket if available (default: true)
 * @param {boolean} options.fallbackToPolling - Fallback to polling if WebSocket transport fails (default: true)
 * @param {boolean} options.useVersionedEndpoint - Poll /api/v1/tasks instead of /tasks
 * @returns {Promise} Promise that resolves with task result
 */
export const waitForTaskCompletion = (taskId, moduleName = null, options = {}) => {
  const { useWebSocket = true, fallbackToPolling = true } = options;
  const useVersionedEndpoint = options.useVersionedEndpoint || false;

  return new Promise((resolve, reject) => {
    let settled = false;
    let closeSocket = null;
    const cancelState = { cancelled: false, wake: null };
    const connections = getActiveConnections();

    const cancelWaiting = () => {
      cancelState.cancelled = true;
      if (typeof cancelState.wake === "function") {
        cancelState.wake();
      }
      settle(reject, createTaskCancelledError());
    };

    function settle(fn, value) {
      if (settled) return;
      settled = true;
      cancelState.cancelled = true; // stops any polling loop still running
      if (typeof cancelState.wake === "function") {
        cancelState.wake();
      }
      if (typeof closeSocket === "function") {
        try {
          closeSocket();
        } catch (_) {
          // no-op
        }
        closeSocket = null;
      }
      if (connections && connections[taskId] === cancelWaiting) {
        delete connections[taskId];
      }
      fn(value);
    }

    const startPolling = () => {
      if (settled) return;
      waitForTaskCompletionPolling(taskId, moduleName, useVersionedEndpoint, cancelState).then(
        (result) => settle(resolve, result),
        (error) => settle(reject, error)
      );
    };

    // Register the cancel hook so cancelTask() can settle this promise.
    if (connections) {
      connections[taskId] = cancelWaiting;
    }

    if (useWebSocket && !webSocketUnavailable && typeof WebSocket !== "undefined") {
      try {
        closeSocket = connectTaskWebSocket(
          taskId,
          moduleName,
          (result) => settle(resolve, result),
          (error) => {
            closeSocket = null;
            if (error?.taskFailed || !fallbackToPolling) {
              // Real task failure (or no fallback requested): report it as is.
              settle(reject, error);
              return;
            }
            // Transport problem: finish this task by polling and stop trying
            // WebSockets for the rest of this page load.
            if (!webSocketUnavailable) {
              webSocketUnavailable = true;
              console.warn(
                "WebSocket updates are not available (" +
                  (error?.message || "connection failed") +
                  "); using polling for task status from now on."
              );
            }
            startPolling();
          }
        );
        return;
      } catch (error) {
        // WebSocket could not even be constructed
        closeSocket = null;
        webSocketUnavailable = true;
        if (!fallbackToPolling) {
          settle(reject, error);
          return;
        }
        console.warn("WebSocket not available, using polling");
      }
    }

    startPolling();
  });
};

/**
 * Sleep that can be interrupted through `cancelState.wake()`.
 */
const interruptibleDelay = (ms, cancelState) =>
  new Promise((res) => {
    const timer = setTimeout(() => {
      if (cancelState) cancelState.wake = null;
      res();
    }, ms);
    if (cancelState) {
      cancelState.wake = () => {
        clearTimeout(timer);
        cancelState.wake = null;
        res();
      };
    }
  });

const parseRetryAfterMs = (headerValue) => {
  if (headerValue === undefined || headerValue === null || headerValue === "") {
    return RATE_LIMIT_DEFAULT_WAIT_MS;
  }
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds * 1000, 500), RATE_LIMIT_MAX_WAIT_MS);
  }
  const date = Date.parse(headerValue);
  if (Number.isFinite(date)) {
    return Math.min(Math.max(date - Date.now(), 500), RATE_LIMIT_MAX_WAIT_MS);
  }
  return RATE_LIMIT_DEFAULT_WAIT_MS;
};

/**
 * Wait for task completion using polling.
 *
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {boolean} useVersionedEndpoint - Whether to use /api/v1/tasks endpoint (default: false for backward compatibility)
 * @param {Object} cancelState - `{ cancelled, wake }` shared with the caller to stop the loop
 * @returns {Promise} Promise that resolves with task result
 */
const waitForTaskCompletionPolling = async (
  taskId,
  moduleName = null,
  useVersionedEndpoint = false,
  cancelState = { cancelled: false, wake: null }
) => {
  // Use the same endpoint format that created the task
  // Legacy tasks created via /getData use /tasks/{task_id}
  // New tasks created via /api/v1/analysis/* use /api/v1/tasks/{task_id}
  const taskEndpoint = useVersionedEndpoint
    ? `${SERVER_ADDRESS}/api/v1/tasks/${taskId}`
    : `${SERVER_ADDRESS}/tasks/${taskId}`;

  const startedAt = Date.now();
  let delayMs = POLL_INITIAL_DELAY_MS;
  let notFoundCount = 0;
  let networkErrorCount = 0;

  const nextDelay = () => {
    const current = delayMs;
    delayMs = Math.min(Math.round(delayMs * POLL_BACKOFF_FACTOR), POLL_MAX_DELAY_MS);
    return current;
  };

  while (Date.now() - startedAt < POLL_OVERALL_LIMIT_MS) {
    if (cancelState.cancelled) {
      throw createTaskCancelledError();
    }

    let response;
    try {
      response = await Axios.get(taskEndpoint, { headers: REQUEST_HEADERS });
    } catch (error) {
      if (cancelState.cancelled) {
        throw createTaskCancelledError();
      }

      const httpStatus = error.response?.status;

      if (httpStatus === 429) {
        // Rate limited: wait as long as the server asks for, then try again.
        const retryAfter = error.response?.headers?.["retry-after"];
        await interruptibleDelay(parseRetryAfterMs(retryAfter), cancelState);
        continue;
      }

      if (httpStatus === 404) {
        // The task may not be visible yet right after submission; after a couple
        // of retries it is really gone (never submitted or result expired).
        notFoundCount += 1;
        if (notFoundCount >= POLL_MAX_NOT_FOUND) {
          const goneError = createTaskFailedError(TASK_GONE_MESSAGE);
          goneError.code = "NOT_FOUND";
          throw goneError;
        }
        await interruptibleDelay(nextDelay(), cancelState);
        continue;
      }

      if (!error.response || httpStatus >= 502) {
        // Transient network / gateway problem: retry a few times.
        networkErrorCount += 1;
        if (networkErrorCount > POLL_MAX_NETWORK_ERRORS) {
          throw error;
        }
        await interruptibleDelay(nextDelay(), cancelState);
        continue;
      }

      // Any other HTTP error is terminal; surface the API message when present.
      const apiError = error.response?.data?.error;
      if (apiError?.message) {
        const failure = createTaskFailedError(apiError.message);
        failure.code = apiError.code;
        failure.details = apiError.details;
        throw failure;
      }
      throw error;
    }

    networkErrorCount = 0;
    notFoundCount = 0;

    const data = response.data;
    const status = data && typeof data === "object" ? data.status : undefined;
    const task_result = data && typeof data === "object" ? data.task_result : undefined;

    // Legacy /tasks may return the final result directly (no wrapper).
    // Treat that as completion.
    if ((status === undefined || status === null) && data !== undefined && data !== null && data !== "") {
      return data;
    }

    if (status === "SUCCESS") {
      if (task_result !== undefined && task_result !== null) {
        return task_result;
      }
      // SUCCESS without a payload yet: keep polling.
    } else if (status === "FAILURE") {
      throw createTaskFailedError(toErrorMessage(task_result ?? data.error ?? data.message));
    } else if (status === "REVOKED") {
      // Cancelled on the server: never a successful result.
      throw createTaskCancelledError("The calculation was cancelled");
    } else if (status === "PROGRESS") {
      const nestedCurrent = task_result?.current;
      const nestedTotal = task_result?.total;
      const message = data.message || task_result?.message || "Processing...";
      const percentage =
        data.percentage ??
        (data.current && data.total ? Math.round((data.current / data.total) * 100) : null) ??
        (nestedCurrent && nestedTotal ? Math.round((nestedCurrent / nestedTotal) * 100) : null);
      dispatchProgress(moduleName, message, percentage);
    } else if (status === "STARTED") {
      dispatchProgress(moduleName, "Task started...");
    } else if (status === "PENDING") {
      dispatchProgress(moduleName, "Task queued, waiting to start...");
    }
    // Other states (RECEIVED, RETRY, ...) are not terminal: keep polling.

    await interruptibleDelay(nextDelay(), cancelState);
  }

  throw new Error(
    "Task timeout: the calculation did not finish within 60 minutes - please try again"
  );
};

/**
 * Cancel a running task.
 *
 * Settles the pending `waitForTaskCompletion` promise for this task (it rejects
 * with a cancellation error) and asks the API to revoke the task.
 *
 * @param {string} taskId - Task identifier to cancel
 * @returns {Promise} Promise that resolves when cancellation is requested
 */
export const cancelTask = async (taskId) => {
  try {
    // Stop waiting locally (closes the WebSocket / stops polling)
    const connections = getActiveConnections();
    if (connections && typeof connections[taskId] === "function") {
      connections[taskId]();
      delete connections[taskId];
    }

    // Request cancellation from API
    const response = await Axios.post(
      `${SERVER_ADDRESS}/api/v1/tasks/${taskId}/cancel`,
      {},
      {
        headers: REQUEST_HEADERS,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error canceling task:", error);
    throw error;
  }
};

// Initialize active task connections tracker
getActiveConnections();
