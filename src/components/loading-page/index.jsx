import React from "react";
import styles from "./loading-page.module.scss";
import { Spinner } from "@oliasoft-open-source/react-ui-library";

const LoadingPage = ({ progressMessage = null, progressPercentage = null }) => {
  // Determine display message
  const displayMessage = progressMessage || "Calculation in progress...";
  
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
    <div className={styles.mainView}>
      <div className={styles.page}>
        <div className={styles.wait_bg}></div>
        <div className={styles.wait_message}>
          <h1>{displayMessage}</h1>
          {stage && (
            <div style={{ 
              marginTop: '10px', 
              fontSize: '14px', 
              color: '#666',
              fontStyle: 'italic' 
            }}>
              {stage}
            </div>
          )}
          {progressPercentage !== null && (
            <div style={{ 
              marginTop: '15px', 
              width: '300px', 
              margin: '15px auto 0',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '20px',
                backgroundColor: '#a63648',
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {progressPercentage}%
              </div>
            </div>
          )}
          <div style={{ marginTop: '20px' }}>
            <Spinner colored dark />
          </div>
        </div>
      </div>
    </div>
  );
};

export { LoadingPage };
