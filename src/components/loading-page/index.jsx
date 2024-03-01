import React from "react";
import styles from "./loading-page.module.scss";
import { Spinner } from "@oliasoft-open-source/react-ui-library";
const LoadingPage = () => {
  return (
    <div className={styles.mainView}>
      <div className={styles.page}>
        <div className={styles.wait_bg}></div>
        <div className={styles.wait_message}>
          <h1>Please wait, calculating...</h1>
          <Spinner colored dark />
        </div>
      </div>
    </div>
  );
};

export { LoadingPage };
