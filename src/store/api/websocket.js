/**
 * WebSocket client for real-time task status updates.
 * Replaces polling with push notifications for better performance.
 */
import { store } from "../store";
import { progressUpdateReceived } from "../results";

let SERVER_ADDRESS = "https://genesetr.uio.no/api";
const isDevEnv = process.env.NODE_ENV !== "production";

if (isDevEnv) {
  SERVER_ADDRESS = "http://localhost:8443";
}

// Map protocol (http/https) to ws/wss
const getWebSocketUrl = (taskId) => {
  const wsProtocol = SERVER_ADDRESS.startsWith("https") ? "wss" : "ws";
  const baseUrl = SERVER_ADDRESS.replace(/^https?:\/\//, "").replace(/\/api$/, "");
  return `${wsProtocol}://${baseUrl}/api/v1/ws/tasks/${taskId}`;
};

/**
 * Connect to WebSocket for task status updates.
 * 
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {Function} onSuccess - Callback when task completes successfully
 * @param {Function} onError - Callback when task fails
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Function} Cancel function to close the connection
 */
export const connectTaskWebSocket = (
  taskId,
  moduleName = null,
  onSuccess = null,
  onError = null,
  onProgress = null
) => {
  const wsUrl = getWebSocketUrl(taskId);
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`WebSocket connected for task: ${taskId}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.status === "SUCCESS") {
        // Task completed successfully
        if (onSuccess) {
          onSuccess(data.result);
        }
        ws.close();
      } else if (data.status === "FAILURE") {
        // Task failed
        const error = new Error(data.error || "Task failed");
        if (onError) {
          onError(error);
        }
        ws.close();
      } else if (data.status === "PROGRESS") {
        // Task in progress
        const message = data.message || "Processing...";
        const percentage = data.percentage || null;
        
        // Dispatch progress update to Redux store
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: message,
            percentage: percentage,
          }));
        }
        
        // Call custom progress callback if provided
        if (onProgress) {
          onProgress({
            message,
            percentage,
            current: data.current,
            total: data.total,
          });
        }
      } else if (data.status === "PENDING") {
        // Task pending
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: "Task queued, waiting to start...",
            percentage: null,
          }));
        }
      } else if (data.status === "STARTED") {
        // Task started but no granular progress yet
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: "Task started...",
            percentage: null,
          }));
        }
      } else {
        // Other task states (RECEIVED, RETRY, etc.)
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: `Task status: ${data.status}`,
            percentage: null,
          }));
        }
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      if (onError) {
        onError(error);
      }
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (onError) {
      onError(new Error("WebSocket connection error"));
    }
  };

  ws.onclose = () => {
    console.log(`WebSocket closed for task: ${taskId}`);
  };

  // Return cancel function
  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
};

/**
 * Wait for task completion using WebSocket (preferred) with polling fallback.
 * 
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {Object} options - Options object
 * @param {boolean} options.useWebSocket - Use WebSocket if available (default: true)
 * @param {boolean} options.fallbackToPolling - Fallback to polling if WebSocket fails (default: true)
 * @returns {Promise} Promise that resolves with task result
 */
export const waitForTaskCompletion = async (taskId, moduleName = null, options = {}) => {
  const { useWebSocket = true, fallbackToPolling = true } = options;

  // Determine if we should use versioned endpoint based on options
  const useVersionedEndpoint = options.useVersionedEndpoint || false;

  // Try WebSocket first if enabled
  if (useWebSocket && typeof WebSocket !== "undefined") {
    try {
      return new Promise((resolve, reject) => {
        let cancel = null;
        let settled = false;

        const cleanup = (shouldCancel = true) => {
          if (settled) return;
          settled = true;

          try {
            if (
              typeof window !== "undefined" &&
              window.activeTaskConnections &&
              window.activeTaskConnections[taskId]
            ) {
              delete window.activeTaskConnections[taskId];
            }
          } catch (_) {
            // no-op
          }

          if (shouldCancel && typeof cancel === "function") {
            try {
              cancel();
            } catch (_) {
              // no-op
            }
          }
          cancel = null;
        };

        cancel = connectTaskWebSocket(
          taskId,
          moduleName,
          (result) => {
            cleanup(true);
            resolve(result);
          },
          (error) => {
            cleanup(true);

            // If WebSocket fails and fallback is enabled, try polling
            if (fallbackToPolling) {
              console.warn("WebSocket failed, falling back to polling");
              waitForTaskCompletionPolling(taskId, moduleName, useVersionedEndpoint)
                .then(resolve)
                .catch(reject);
            } else {
              reject(error);
            }
          }
        );

        // Store cancel function for potential cancellation, but ensure we also cleanup the tracking entry.
        if (typeof window !== "undefined") {
          window.activeTaskConnections = window.activeTaskConnections || {};
          window.activeTaskConnections[taskId] = () => {
            cleanup(true);
          };
        }
      });
    } catch (error) {
      // WebSocket not available or failed, fallback to polling
      if (fallbackToPolling) {
        console.warn("WebSocket not available, using polling");
        return waitForTaskCompletionPolling(taskId, moduleName, useVersionedEndpoint);
      }
      throw error;
    }
  }

  // Use polling as fallback or if WebSocket disabled
  return waitForTaskCompletionPolling(taskId, moduleName, useVersionedEndpoint);
};

/**
 * Wait for task completion using polling (legacy method).
 * 
 * @param {string} taskId - Task identifier
 * @param {string} moduleName - Module name for progress updates
 * @param {boolean} useVersionedEndpoint - Whether to use /api/v1/tasks endpoint (default: false for backward compatibility)
 * @returns {Promise} Promise that resolves with task result
 */
const waitForTaskCompletionPolling = async (taskId, moduleName = null, useVersionedEndpoint = false) => {
  const Axios = (await import("axios")).default;
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  let times = 1;
  const maxAttempts = 30;

  // Use the same endpoint format that created the task
  // Legacy tasks created via /getData use /tasks/{task_id}
  // New tasks created via /api/v1/analysis/* use /api/v1/tasks/{task_id}
  const taskEndpoint = useVersionedEndpoint 
    ? `${SERVER_ADDRESS}/api/v1/tasks/${taskId}`
    : `${SERVER_ADDRESS}/tasks/${taskId}`;

  do {
    try {
      const response = await Axios.get(taskEndpoint, {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      });

      const data = response.data;
      const status = data.status;
      const task_result = data.task_result;

      if (status === "PENDING") {
        // Still pending, continue polling
      } else if (status === "FAILURE") {
        throw new Error(task_result || "Task failed");
      } else if (status === "PROGRESS") {
        const nestedCurrent = task_result?.current;
        const nestedTotal = task_result?.total;
        const message = data.message || task_result?.message || "Processing...";
        const percentage =
          data.percentage ??
          (data.current && data.total ? Math.round((data.current / data.total) * 100) : null) ??
          (nestedCurrent && nestedTotal ? Math.round((nestedCurrent / nestedTotal) * 100) : null);

        // Dispatch progress update
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: message,
            percentage: percentage,
          }));
        }
      } else if (status === "STARTED") {
        if (moduleName) {
          store.dispatch(progressUpdateReceived({
            module: moduleName,
            message: "Task started...",
            percentage: null,
          }));
        }
      } else if (status === "SUCCESS" && task_result !== undefined && task_result !== null) {
        return task_result;
      } else if (task_result !== undefined && task_result !== null && status !== "PENDING" && status !== "PROGRESS") {
        return task_result;
      }

      await delay(times * 250);
      times++;
    } catch (error) {
      // If it's a 404 or task not found, wait a bit and retry
      if (error.response?.status === 404 && times < maxAttempts) {
        await delay(times * 250);
        times++;
        continue;
      }
      throw error;
    }
  } while (times < maxAttempts);

  throw new Error("Task timeout: Maximum polling attempts reached");
};

/**
 * Cancel a running task.
 * 
 * @param {string} taskId - Task identifier to cancel
 * @returns {Promise} Promise that resolves when cancellation is requested
 */
export const cancelTask = async (taskId) => {
  const Axios = (await import("axios")).default;
  
  try {
    // Close WebSocket connection if active
    if (window.activeTaskConnections && window.activeTaskConnections[taskId]) {
      window.activeTaskConnections[taskId]();
      delete window.activeTaskConnections[taskId];
    }

    // Request cancellation from API
    const response = await Axios.post(
      `${SERVER_ADDRESS}/api/v1/tasks/${taskId}/cancel`,
      {},
      {
        headers: {
          "ngrok-skip-browser-warning": "69420",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error canceling task:", error);
    throw error;
  }
};

// Initialize active task connections tracker
if (typeof window !== "undefined") {
  window.activeTaskConnections = window.activeTaskConnections || {};
}

