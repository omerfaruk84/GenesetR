import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { ROUTES } from '../../common/routes';
import { HeatMap } from '../heat-map';
import { TopBar } from '../top-bar';
import styles from './main-view.module.scss';
import { NotFoundPage } from '../not-found-page';
import { Spacer } from '@oliasoft-open-source/react-ui-library';
import { SideBar } from '../side-bar';
import { Bokeh } from '../bokeh';

const MainView = () => {
  return (
    <div className={styles.mainView}>
      <Router>    
        <TopBar />
        <SideBar />
        <Spacer />
        <Routes>
          <Route exact path={ROUTES.HEATMAP} element={<HeatMap />} />
          <Route exact path={ROUTES.PCA} element={<Bokeh />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export { MainView };