import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { ROUTES } from '../../common/routes';
import { CorrelationPage } from '../../pages/correlation/correlation-page';
import { TopBar } from '../top-bar';
import styles from './main-view.module.scss';
import { NotFoundPage } from '../not-found-page';
import { Spacer } from '@oliasoft-open-source/react-ui-library';
import { SideBar } from '../side-bar';
import { Cytoscape } from '../cytoscape';
import { GeneRegulationPage } from '../../pages/gene-regulation/gene-regulation-page';
import { ScatterPlot } from '../scatterPlot';

const MainView = () => {
  return (
    <div className={styles.mainView}>
      <Router>
        <TopBar />
        <SideBar />
        <Spacer />
        <Routes>
          {/* <Route exact path={ROUTES.HEATMAP} element={<HeatMap />} /> */}
          <Route exact path={ROUTES.PCA} element={<ScatterPlot />} />
          <Route exact path={ROUTES.MDE} element={<ScatterPlot />} />
          <Route exact path={ROUTES.UMAP} element={<ScatterPlot />} />
          <Route exact path={ROUTES.TSNE} element={<ScatterPlot />} />
          <Route
            exact
            path={ROUTES.CORRELATION}
            element={<CorrelationPage path={ROUTES.CORRELATION} />}
          />
          {/* <Route exact path={ROUTES.BI_CLUSTERING} element={<HeatMap />} /> */}
          <Route exact path={ROUTES.GENE_REGULATION} element={<GeneRegulationPage />} />
          <Route exact path={ROUTES.PATHFINDER} element={<Cytoscape />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export { MainView };