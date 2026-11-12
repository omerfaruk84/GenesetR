import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { cancelCalculation } from "../../store/results";
import styles from "./loading-page.module.scss";

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
};

// After this many seconds the page reassures the user that long runs are normal
const LONG_RUN_HINT_SECONDS = 20;

const LoadingPage = ({
  progressMessage = null,
  progressPercentage = null,
  onCancel = null,
  showCancel = true,
}) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  // By default the calculation of the current page is cancelled; callers can
  // pass their own handler (or showCancel={false}) when that does not apply.
  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      if (typeof onCancel === "function") {
        await onCancel();
      } else {
        await dispatch(cancelCalculation(pathname));
      }
    } finally {
      setCancelling(false);
    }
  };

  // Determine display message
  const displayMessage = progressMessage || "Calculation in progress...";
  const clampedPercentage =
    typeof progressPercentage === "number"
      ? // This page is only shown while the result is still outstanding, so
        // the display stops at 99 % until the result has actually arrived.
        Math.max(0, Math.min(99, Math.round(progressPercentage)))
      : null;
  
  // Determine stage from message content
  const getStage = (message) => {
    if (!message) return null;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("initial") || lowerMessage.includes("start")) {
      return "Initializing";
    } else if (lowerMessage.includes("final") || lowerMessage.includes("complet") || lowerMessage.includes("finish")) {
      return "Finalizing";
    } else if (lowerMessage.includes("process") || lowerMessage.includes("calculat")) {
      return "Processing";
    }
    return null;
  };

  const stage = getStage(progressMessage);

  return (
    <div className={styles.mainView} aria-busy="true">
      <div
        className={styles.card}
        role="status"
        aria-live="polite"
        aria-label={clampedPercentage !== null ? `Progress ${clampedPercentage}%` : "Working"}
      >
        <div className={styles.topRow}>
          <div
            className={`${styles.ring} ${clampedPercentage === null ? styles.ringIndeterminate : ""}`}
            style={clampedPercentage === null ? undefined : { "--p": clampedPercentage }}
          >
            <div className={styles.ringInner}>
              <div className={styles.ringValue}>
                {clampedPercentage === null ? (
                  <span className={styles.ringValueText}>…</span>
                ) : (
                  <span className={styles.ringValueText}>{clampedPercentage}%</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.textBlock}>
            <div className={styles.title}>{displayMessage}</div>
            {stage && <div className={styles.stage}>{stage}</div>}
            <div className={styles.caption}>
              {elapsed >= LONG_RUN_HINT_SECONDS
                ? "Still working - large gene lists and whole-genome datasets can take a few minutes. Please keep this tab open."
                : "Please keep this tab open while the results are computed."}
            </div>
          </div>
        </div>

        <div className={styles.progressBlock}>
          {clampedPercentage === null ? (
            <div
              className={styles.barIndeterminate}
              role="progressbar"
              aria-label="Calculation in progress"
            />
          ) : (
            <div
              className={styles.barTrack}
              role="progressbar"
              aria-label="Calculation progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clampedPercentage}
            >
              <div className={styles.barFill} style={{ "--p": clampedPercentage }} />
            </div>
          )}
          <div className={styles.metaRow}>
            <div className={styles.metaLeft}>
              {clampedPercentage === null ? "Working…" : `Progress: ${clampedPercentage}%`}
              <span className={styles.elapsed}> · {formatElapsed(elapsed)} elapsed</span>
            </div>
            <div className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        {showCancel && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={cancelling}
              title="Stop waiting for this calculation"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        )}

        <div className={styles.skeleton} aria-hidden="true">
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
        </div>
      </div>
    </div>
  );
};

export { LoadingPage };
