import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "../error-boundary";
import { ROUTES } from "../../common/routes";
import { CorrelationPage } from "../../pages/correlation/correlation-page";
import { CorrelationPageWebGL } from "../../pages/correlation/correlation-page-webgl";
import { CorrelationPageFast } from "../../pages/correlation/correlation-page-fast";
import { TopBar } from "../top-bar";
import styles from "./main-view.module.scss";
import { NotFoundPage } from "../not-found-page";
import { Spacer } from "@oliasoft-open-source/react-ui-library";
import { SideBar } from "../side-bar";
import { GeneRegulationPage } from "../../pages/gene-regulation/gene-regulation-page";
import { GeneRegulationEnhancedPage } from "../../pages/gene-regulation-enhanced/gene-regulation-enhanced-page";
import { PathFinderPage } from "../../pages/pathfinder/pathfinder";
import { GeneSignaturePage } from "../../pages/genesignature/gene-signature-page";
import { DeregulatedGenesPage } from "../../pages/deregulated-genes/deregulated-genes-page";
import { HeatMapPage } from "../../pages/heatmap/heatmap-page";
import { MainPage } from "../../pages/mainpage/mainpage";
import { DimReductionPage } from "../../pages/dim-reduction-page/dim-reduction-page";
import AboutPage from "../../pages/aboutus/about";
import { ExpressionAnalyzerPage } from "../../pages/expressionanalyzer/expression-analyzer";
import { MultiDatasetComparisonPage } from "../../pages/multidataset-comparison/multidataset-comparison-page";
import { GenelistCompare } from "../genelist-compare";
import { CellCyclePage } from "../../pages/cell-cycle/cell-cycle-page";
import UploadDatasetPage from "../../pages/upload-dataset/upload-dataset-page";
import { GenePage } from "../../pages/gene/gene-page";

// A rendering error in one page must not blank the whole application: the
// page area shows an error box with "Try again", the navigation keeps working,
// and moving to another page resets the boundary.
const PageBoundary = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary label="This page" resetKeys={[pathname]}>
      {children}
    </ErrorBoundary>
  );
};

const SideBarLayout = () => (
  <div className={styles.contentWrapper}>
    <Spacer />
    <div className={styles.flexContainer}>
      <SideBar />
      <div className={styles.routeContent}>
        <PageBoundary>
          <Outlet />
        </PageBoundary>
      </div>
    </div>
  </div>
);

const MainView = () => {
  return (
    <Router>
      <div className={styles.mainView}>
        <TopBar />
        <Routes>
          <Route
            path={ROUTES.HOME}
            element={
              <div className={styles.homeContentWrapper}>
                <PageBoundary>
                  <MainPage />
                </PageBoundary>
              </div>
            }
          />
          <Route path={ROUTES.ABOUTUS} element={<PageBoundary><AboutPage /></PageBoundary>} />
          <Route path={ROUTES.GENE} element={<PageBoundary><GenePage /></PageBoundary>} />
          <Route path={ROUTES.UPLOAD_DATASET} element={<PageBoundary><UploadDatasetPage /></PageBoundary>} />
          <Route element={<SideBarLayout />}>
            <Route path={ROUTES.DR} element={<DimReductionPage />} />
            <Route
              path={ROUTES.CORRELATION}
              element={<CorrelationPage path={ROUTES.CORRELATION} />}
            />
            <Route
              path={ROUTES.CORRELATION_WEBGL}
              element={<CorrelationPageWebGL path={ROUTES.CORRELATION_WEBGL} />}
            />
            <Route
              path={ROUTES.CORRELATION_FAST}
              element={<CorrelationPageFast path={ROUTES.CORRELATION_FAST} />}
            />
            <Route
              path={ROUTES.PATHFINDER}
              element={<PathFinderPage path={ROUTES.PATHFINDER} />}
            />
            <Route
              path={ROUTES.GENESIGNATURE}
              element={<GeneSignaturePage path={ROUTES.GENESIGNATURE} />}
            />
            <Route
              path={ROUTES.DEREGULATED_GENES}
              element={<DeregulatedGenesPage path={ROUTES.DEREGULATED_GENES} />}
            />
            <Route
              path={ROUTES.EXPRESSIONANALYZER}
              element={
                <ExpressionAnalyzerPage path={ROUTES.EXPRESSIONANALYZER} />
              }
            />
            <Route path={ROUTES.CELL_CYCLE} element={<CellCyclePage />} />
            <Route
              path={ROUTES.MULTIDATASET_COMPARISON}
              element={
                <MultiDatasetComparisonPage
                  path={ROUTES.MULTIDATASET_COMPARISON}
                />
              }
            />
            <Route
              path={ROUTES.HEATMAP}
              element={<HeatMapPage path={ROUTES.HEATMAP} />}
            />
            <Route
              path={ROUTES.GENELISTCOMPARE}
              element={<GenelistCompare path={ROUTES.GENELISTCOMPARE} />}
            />
            <Route
              path={ROUTES.GENE_REGULATION}
              element={<GeneRegulationPage path={ROUTES.GENE_REGULATION} />}
            />
            <Route
              path={ROUTES.GENE_REGULATION_ENHANCED}
              element={
                <GeneRegulationEnhancedPage
                  path={ROUTES.GENE_REGULATION_ENHANCED}
                />
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export { MainView };
