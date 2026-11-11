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
  geneRegulationCoreSettings,
  geneRegulationEnhancedSettings,
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

  // Multi-dataset gene signature runs track their state in a separate module
  if (pathname === ROUTES.GENESIGNATURE) {
    isCalcRunning =
      isCalcRunning || calcResults?.genesignatureMultiDataset?.running;
  }

  const isCorrelationRoute =
    pathname === ROUTES.CORRELATION || pathname === ROUTES.CORRELATION_WEBGL;

  // Custom button labels per module
  const buttonLabels = {
    [ROUTES.GENESIGNATURE]: "Calculate Gene Signature",
    [ROUTES.CORRELATION]: "Calculate Correlation",
    [ROUTES.CORRELATION_WEBGL]: "Calculate Correlation",
    [ROUTES.HEATMAP]: "Generate Heatmap",
    [ROUTES.PATHFINDER]: "Find Path",
    [ROUTES.EXPRESSIONANALYZER]: "Analyze Expression",
    [ROUTES.MULTIDATASET_COMPARISON]: "Compare Datasets",
    [ROUTES.GENE_REGULATION]: "Build Gene Network",
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
    (isCorrelationRoute &&
      coreSettings.peturbationList?.trim().split("\n").length > 1 &&
      hasSelectedDatasets) ||
    (pathname === ROUTES.DR &&
      coreSettings.peturbationList?.trim().split("\n").length > 9) ||
    (pathname === ROUTES.GENE_REGULATION &&
      geneRegulationCoreSettings?.selectedGene?.trim()?.length > 0) ||
    (pathname === ROUTES.GENE_REGULATION_ENHANCED &&
      geneRegulationEnhancedSettings?.selectedGene?.trim()?.length > 0 &&
      geneRegulationEnhancedSettings?.selectedExperiments?.length > 0) ||
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

  // Tell the user what is missing while the button is disabled
  let disabledReason = "";
  if (isDisabled && !isCalcRunning) {
    if (isCorrelationRoute) {
      disabledReason = !hasSelectedDatasets
        ? "Select at least one dataset"
        : "Enter at least 2 genes";
    } else if (pathname === ROUTES.DR) {
      disabledReason = "Enter at least 10 genes";
    } else if (pathname === ROUTES.HEATMAP) {
      disabledReason = "Enter at least 3 genes in one of the lists";
    } else if (pathname === ROUTES.PATHFINDER) {
      disabledReason = "Enter at least 2 genes";
    } else if (pathname === ROUTES.GENESIGNATURE) {
      disabledReason = "Enter a gene signature";
    } else if (pathname === ROUTES.DEREGULATED_GENES) {
      disabledReason = "Enter at least one perturbation";
    } else if (
      pathname === ROUTES.MULTIDATASET_COMPARISON ||
      pathname === ROUTES.GENE_REGULATION
    ) {
      disabledReason = "Select a gene";
    } else if (pathname === ROUTES.GENE_REGULATION_ENHANCED) {
      disabledReason = "Select a gene and at least one experiment";
    }
  }

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
          pathname !== ROUTES.CELL_CYCLE &&
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
              {disabledReason && (
                <div
                  role="status"
                  style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#8a6d3b",
                    marginTop: "4px",
                  }}
                >
                  {disabledReason}
                </div>
              )}
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
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
  geneRegulationEnhancedSettings: settings?.geneRegulationEnhanced ?? {},
});

const mapDispatchToProps = {
  runCalculation,
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(SideBar);

export { MainContainer as SideBar };
