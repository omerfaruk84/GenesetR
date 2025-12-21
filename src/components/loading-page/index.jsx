import React from "react";
import styles from "./loading-page.module.scss";

const LoadingPage = ({ progressMessage = null, progressPercentage = null }) => {
  // Determine display message
  const displayMessage = progressMessage || "Calculation in progress...";
  const clampedPercentage =
    typeof progressPercentage === "number"
      ? Math.max(0, Math.min(100, Math.round(progressPercentage)))
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
            <div className={styles.caption}>Please keep this tab open while the results are computed.</div>
          </div>
        </div>

        <div className={styles.progressBlock}>
          {clampedPercentage === null ? (
            <div className={styles.barIndeterminate} aria-hidden="true" />
          ) : (
            <div className={styles.barTrack} aria-hidden="true">
              <div className={styles.barFill} style={{ "--p": clampedPercentage }} />
            </div>
          )}
          <div className={styles.metaRow}>
            <div className={styles.metaLeft}>
              {clampedPercentage === null ? "Working…" : `Progress: ${clampedPercentage}%`}
            </div>
            <div className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

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
