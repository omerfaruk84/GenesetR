import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { CorrelationPage } from "../../pages/correlation/correlation-page";
import { TopBar } from "../top-bar";
import styles from "./main-view.module.scss";
import { NotFoundPage } from "../not-found-page";
import { Spacer } from "@oliasoft-open-source/react-ui-library";
import { SideBar } from "../side-bar";
import { GeneRegulationPage } from "../../pages/gene-regulation/gene-regulation-page";
import { GeneRegulationEnhancedPage } from "../../pages/gene-regulation-enhanced/gene-regulation-enhanced-page";
import { PathFinderPage } from "../../pages/pathfinder/pathfinder";
import { GeneSignaturePage } from "../../pages/genesignature/gene-signature-page";
import { HeatMapPage } from "../../pages/heatmap/heatmap-page";
import { MainPage } from "../../pages/mainpage/mainpage";
import { DimReductionPage } from "../../pages/dim-reduction-page/dim-reduction-page";
import AboutPage from "../../pages/aboutus/about";
import { ExpressionAnalyzerPage } from "../../pages/expressionanalyzer/expression-analyzer";
import { MultiDatasetComparisonPage } from "../../pages/multidataset-comparison/multidataset-comparison-page";
import { GenelistCompare } from "../genelist-compare";
import { PerturbationSignaturesPage } from "../../pages/perturbation-signatures/perturbation-signatures-page";

const SideBarLayout = () => (
  <div className={styles.contentWrapper}>
    <Spacer />
    <div className={styles.flexContainer}>
      <SideBar />
      <div className={styles.routeContent}>
        <Outlet />
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
                <MainPage />
              </div>
            }
          />
          <Route path={ROUTES.ABOUTUS} element={<AboutPage />} />
          <Route element={<SideBarLayout />}>
            <Route path={ROUTES.DR} element={<DimReductionPage />} />
            <Route
              path={ROUTES.CORRELATION}
              element={<CorrelationPage path={ROUTES.CORRELATION} />}
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
              path={ROUTES.EXPRESSIONANALYZER}
              element={
                <ExpressionAnalyzerPage path={ROUTES.EXPRESSIONANALYZER} />
              }
            />
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
            <Route
              path={ROUTES.PERTURBATION_SIGNATURES}
              element={
                <PerturbationSignaturesPage
                  path={ROUTES.PERTURBATION_SIGNATURES}
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
