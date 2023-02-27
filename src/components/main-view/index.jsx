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
import { HeatMap } from '../heat-map';
import { GeneRegulationPage } from '../../pages/gene-regulation/gene-regulation-page';
import { PcaPage } from '../../pages/pca/pca-page';
import { MdePage } from '../../pages/mde/mde-page';
import { UmapPage } from '../../pages/umap/umap-page';
import { TsnePage } from '../../pages/tsne/tsne-page';
import { PathFinderPage } from '../../pages/pathfinder/pathfinder';
const MainView = () => {
  return (
    <div className={styles.mainView}>
      <Router>
        <TopBar />
        <SideBar />
        <Spacer />
        <Routes>
          {/* <Route exact path={ROUTES.HEATMAP} element={<HeatMap />} /> */}
          <Route
            exact
            path={ROUTES.PCA}
            element={<PcaPage path={ROUTES.PCA} />}
          />
          <Route
            exact
            path={ROUTES.MDE}
            element={<MdePage path={ROUTES.MDE} />}
          />
           <Route
            exact
            path={ROUTES.UMAP}
            element={<UmapPage path={ROUTES.UMAP} />}
          />
           <Route
            exact
            path={ROUTES.TSNE}
            element={<TsnePage path={ROUTES.TSNE} />}
          />       
          <Route
            exact
            path={ROUTES.CORRELATION}
            element={<CorrelationPage path={ROUTES.CORRELATION} />}
          />
           <Route
            exact
            path={ROUTES.PATHFINDER}
            element={<PathFinderPage path={ROUTES.PATHFINDER} />}
          />
          {/* <Route exact path={ROUTES.BI_CLUSTERING} element={<HeatMap />} /> */}
          <Route exact path={ROUTES.GENE_REGULATION} element={<GeneRegulationPage />} />
         

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export { MainView };