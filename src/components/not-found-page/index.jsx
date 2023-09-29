import React from "react";
import { Button } from "@oliasoft-open-source/react-ui-library";
import { Link } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import styles from "./not-found-page.module.scss";

const NotFoundPage = () => {
  return (
    <div className={styles.mainView}>
      <div className={styles.page_404}>
        <div className={styles.four_zero_four_bg}>
          <h1>404</h1>
        </div>
        <div className={styles.contant_box_404}>
          <h3 className="h2">Look like you're lost</h3>
          <p>The page you are looking is not avaible!</p>
          <Link to={ROUTES.HOME}>
            <Button colored label="Go to Home" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export { NotFoundPage };
