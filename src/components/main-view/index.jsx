import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { ROUTES } from '../../common/routes';
import { HeatMap } from '../heat-map';
import { TopBar } from '../top-bar';
import ExampleJson from '../heat-map/example.json';
import styles from './main-view.module.scss';
import { NotFoundPage } from '../not-found-page';

const MainView = () => {
  return (
    <div className={styles.mainView}>
      <Router>
        <TopBar />
        <Routes>
          <Route exact path={ROUTES.HEATMAP} element={<HeatMap data={ExampleJson} />}/>
          <Route path="*" element={<NotFoundPage />}/>
        </Routes>
      </Router>
    </div>
  );
};

export { MainView };