import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { CorrelationPage } from "../../pages/correlation/correlation-page";
import { TopBar } from "../top-bar";
import styles from "./main-view.module.scss";
import { NotFoundPage } from "../not-found-page";
import { Spacer } from "@oliasoft-open-source/react-ui-library";
import { SideBar } from "../side-bar";
import { GeneRegulationPage } from "../../pages/gene-regulation/gene-regulation-page";
import { PathFinderPage } from "../../pages/pathfinder/pathfinder";
import { GeneSignaturePage } from "../../pages/genesignature/gene-signature-page";
import { HeatMapPage } from "../../pages/heatmap/heatmap-page";
import { MainPage } from "../../pages/mainpage/mainpage";
import { DimReductionPage } from "../../pages/dim-reduction-page/dim-reduction-page";
import AboutPage from "../../pages/aboutus/about";
import { ExpressionAnalyzerPage } from "../../pages/expressionanalyzer/expression-analyzer";
import { GenelistCompare } from "../genelist-compare";
const MainView = () => {
  return (
    <div className={styles.mainView}>
      <Router>
        <TopBar />

        <Spacer />
        <Routes>
          {/* Home page route without SideBar */}
          <Route exact path={ROUTES.HOME} element={<MainPage />} />
          <Route exact path={ROUTES.ABOUTUS} element={<AboutPage />} />
          {/* Other page routes with SideBar */}
          <Route
            path="*"
            element={
              <>
                <SideBar />
                <Routes>
                  <Route
                    exact
                    path={ROUTES.DR}
                    element={<DimReductionPage />}
                  />
                  <Route
                    exact
                    path={ROUTES.DR + "/pca"}
                    element={<DimReductionPage />}
                  />
                  <Route
                    exact
                    path={ROUTES.PCA}
                    element={<DimReductionPage />}
                  />
                  <Route
                    exact
                    path={ROUTES.MDE}
                    element={<DimReductionPage />}
                  />
                  <Route
                    exact
                    path={ROUTES.UMAP}
                    element={<DimReductionPage />}
                  />
                  <Route
                    exact
                    path={ROUTES.TSNE}
                    element={<DimReductionPage />}
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
                  <Route
                    exact
                    path={ROUTES.GENESIGNATURE}
                    element={<GeneSignaturePage path={ROUTES.GENESIGNATURE} />}
                  />
                  <Route
                    exact
                    path={ROUTES.EXPRESSIONANALYZER}
                    element={
                      <ExpressionAnalyzerPage
                        path={ROUTES.EXPRESSIONANALYZER}
                      />
                    }
                  />
                  <Route
                    exact
                    path={ROUTES.HEATMAP}
                    element={<HeatMapPage path={ROUTES.HEATMAP} />}
                  />
                  {
                    <Route
                      exact
                      path={ROUTES.GENELISTCOMPARE}
                      element={
                        <GenelistCompare path={ROUTES.GENELISTCOMPARE} />
                      }
                    />
                  }
                  <Route
                    exact
                    path={ROUTES.GENE_REGULATION}
                    element={
                      <GeneRegulationPage path={ROUTES.GENE_REGULATION} />
                    }
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </Router>
    </div>
  );
};

export { MainView };
