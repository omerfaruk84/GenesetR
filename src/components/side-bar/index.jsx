import React, { useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  Drawer,
  Button,
  Spacer,
  Flex,
} from "@oliasoft-open-source/react-ui-library";
import { SettingsSelector } from "./settings/settings-selector";
import { runCalculation } from "../../store/results/index";
import { ModulePathNames } from "../../store/results/enums";
import { ROUTES } from "../../common/routes";
import { coreSettingsChanged } from "../../store/settings/core-settings";
import { CoreSettingsTypes } from "./settings/enums";
const SideBar = ({
  runCalculation,
  calcResults,
  coreSettings,
  coreSettingsChanged,
  multidatasetComparisonSettings,
  correlationSettings,
}) => {
  const [sideBarWith, setSideBarWith] = useState(300);
  const handleSideBarResize = (size) => {
    if (size > 500 || size < 250) {
      return;
    }
    setSideBarWith(size);
  };

  const location = useLocation();
  const { pathname } = location;
  var isCalcRunning = false;

  //We need this as we have multiple DR algorithms under DR tab
  if (pathname === ROUTES.DR) {
    isCalcRunning =
      calcResults?.[ModulePathNames?.["/" + coreSettings.currentModule]]
        ?.running;
  } else {
    isCalcRunning = calcResults?.[ModulePathNames?.[pathname]]?.running;
  }

  // Custom button labels per module
  const buttonLabels = {
    [ROUTES.GENESIGNATURE]: "Calculate Gene Signature",
    [ROUTES.CORRELATION]: "Calculate Correlation",
    [ROUTES.HEATMAP]: "Generate Heatmap",
    [ROUTES.PATHFINDER]: "Find Path",
    [ROUTES.EXPRESSIONANALYZER]: "Analyze Expression",
    [ROUTES.MULTIDATASET_COMPARISON]: "Compare Datasets",
    [ROUTES.GENE_REGULATION_ENHANCED]: "Expand Gene Network",
    // Default for DR and other modules
    default: "Run Calculation",
  };

  // Get button label for current path
  const getButtonLabel = () => {
    if (pathname === ROUTES.DR) {
      // For DR, use module-specific labels
      const drLabels = {
        pca: "Calculate PCA",
        mde: "Calculate MDE",
        umap: "Calculate UMAP",
        tsne: "Calculate t-SNE",
      };
      return drLabels[coreSettings.currentModule] || buttonLabels.default;
    }
    return buttonLabels[pathname] || buttonLabels.default;
  };

  //To set runcalc button disabled or not
  let isDisabled = true;
  
  // For correlation, require both perturbation list and at least one selected dataset
  const hasSelectedDatasets = correlationSettings?.selectedDatasets && 
                               Array.isArray(correlationSettings.selectedDatasets) && 
                               correlationSettings.selectedDatasets.length > 0;
  
  if (
    (pathname === ROUTES.CORRELATION &&
      coreSettings.peturbationList?.trim().split("\n").length > 1 &&
      hasSelectedDatasets) ||
    (pathname === ROUTES.DR &&
      coreSettings.peturbationList?.trim().split("\n").length > 9) ||
    pathname === ROUTES.GENE_REGULATION ||
    (pathname === ROUTES.HEATMAP &&
      (coreSettings.peturbationList?.trim().split("\n").length > 2 ||
        coreSettings.targetGeneList?.trim().split("\n").length > 2)) ||
    (pathname === ROUTES.PATHFINDER &&
      coreSettings.peturbationList?.trim().split("\n").length > 1) ||
    (pathname === ROUTES.GENESIGNATURE &&
      coreSettings.targetGeneList?.length > 1) ||
    (pathname === ROUTES.DEREGULATED_GENES &&
      coreSettings.peturbationList?.trim().split("\n").filter(line => line.trim().length > 0).length > 0) ||
    pathname === ROUTES.EXPRESSIONANALYZER ||
    pathname === ROUTES.GENELISTCOMPARE ||
    (pathname === ROUTES.MULTIDATASET_COMPARISON &&
      multidatasetComparisonSettings?.selectedGene?.trim()?.length > 0)
  )
    isDisabled = false;

  return (
    <div>
      <Drawer
        border
        button
        closedWidth={10}
        open
        width={sideBarWith}
        onResize={handleSideBarResize}
      >
        {pathname !== ROUTES.GENELISTCOMPARE &&
          pathname !== ROUTES.GENE_REGULATION &&
          !(pathname === ROUTES.DR && coreSettings.currentModule === "precomputed") && (
            <>
              <Spacer />
              <Flex justifyContent="center">
                <Button
                  label={isCalcRunning ? "Pending" : getButtonLabel()}
                  colored
                  width="90%"
                  disabled={isCalcRunning || isDisabled}
                  onClick={() => {
                    runCalculation(pathname);
                    coreSettingsChanged({
                      settingName: CoreSettingsTypes.SHOW_HELP,
                      newValue: false,
                    });
                  }}
                />
              </Flex>
            </>
          )}
        <Spacer />
        <div
          id="scrollableDiv"
          style={{
            height: "calc(100vh - 140px)",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#a63648 transparent",
          }}
        >
          {pathname === ROUTES.DR ? (
            <SettingsSelector pathname={"/" + coreSettings.currentModule} />
          ) : (
            <SettingsSelector pathname={pathname} />
          )}
        </div>
      </Drawer>
    </div>
  );
};

const mapStateToProps = ({ calcResults, settings }) => ({
  calcResults,
  coreSettings: settings?.core ?? {},
  multidatasetComparisonSettings: settings?.multidatasetComparison ?? {},
  correlationSettings: settings?.correlation ?? {},
});

const mapDispatchToProps = {
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(SideBar);

export { MainContainer as SideBar };
