import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../common/routes';
import styles from './not-found-page.module.scss';
import { Bokeh } from '../bokeh';
const NotFoundPage = () => {
  return (
    <div className={styles.mainView}>
      <div className={styles.page_404}>
        <div className={styles.four_zero_four_bg}>
          <h1>404</h1>
        </div>
        <div className={styles.contant_box_404}>
          <h3 className="h2">Look like you're lost</h3>
          <p>the page you are looking for not avaible!</p>
          <Link to={ROUTES.HOME} className={styles.link_404}>Go to Home</Link>
          <Bokeh />
        </div>

      </div>
    </div>
  );
};

export { NotFoundPage };
