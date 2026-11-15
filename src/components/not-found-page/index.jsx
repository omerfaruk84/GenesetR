import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import styles from "./not-found-page.module.scss";

const NotFoundPage = () => {
  return (
    <div className={styles.mainView}>
      <div className={styles.box}>
        <h1>404</h1>
        <h2>This page does not exist</h2>
        <p>The address may be mistyped, or the page has moved. The menu at the top lists every module.</p>
        <Link to={ROUTES.HOME} className={styles.home}>
          Go to the start page
        </Link>
      </div>
    </div>
  );
};

export { NotFoundPage };
