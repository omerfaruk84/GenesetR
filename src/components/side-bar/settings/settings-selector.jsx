import React from "react";
import { ROUTES } from "../../../common/routes";
import { Settings } from "./settings";
import { CoreSettings } from "./core-settings";
import { TsneSettings } from "./tsne-settings";
import { GeneRegulationSettings } from "./gene-regulation-core-settings";
import { GeneRegulationEnhancedSettings } from "./gene-regulation-enhanced-settings";
import { CorrelationSettings } from "./correlation-settings";
import { GeneSignatureSettings } from "./genesignature-settings";
import { ExpressionAnalyzerSettings } from "./expression-analyzer-settings";
import { ClusteringSettings } from "./clustering-settings";
import { PcaSettings } from "./pca-settings";
import { UmapSettings } from "./umap-settings";
import { MdeSettings } from "./mde-settings";
import { HeatMapSettings } from "./heatmap-settings";
import { InchlibSettings } from "./inchlib-settings";
import { PathFinderSettings } from "./pathfinder-settings";
import { ScatterPlotSettings } from "./scatterplot-settings";
import { SettingsTypes } from "./enums";
import { GenelistCompareSettings } from "./genelist-compare";
import { MultiDatasetComparisonSettings } from "./multidataset-comparison-settings";
import { PrecomputedDrSettings } from "./precomputed-dr-settings";
import { DrMethodSelector } from "./dr-method-selector";

const SettingsSelector = ({ pathname }) => {
  const settingsMap = {
    [ROUTES.HOME]: [
      {
        //settingsName: SettingsTypes.CORE_SETTINGS,
        //settings: <CoreSettings />
      },
    ],
    [ROUTES.DR]: [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source={"DR"} />,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
    ],
    [ROUTES.CORRELATION]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            source={"CORR"}
            showcellLineOptions={true}
            showPerturbationList={true}
            showGeneList={true}
            showdataTypeOptions={true}
            showgraphTypeOptions={false}
          />
        ),
      },
      {
        settingsName: SettingsTypes.CORRELATION_SETTINGS,
        settings: <CorrelationSettings />,
      },
      {
        settingsName: SettingsTypes.INCHLIB_SETTINGS,
        settings: <InchlibSettings />,
      },
    ],
    [ROUTES.PCA]: [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source={"DR"} />,
      },
      {
        settingsName: SettingsTypes.PCA_SETTINGS,
        settings: <PcaSettings />,
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
    ],
    [ROUTES.MDE]: [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source={"DR"} />,
      },
      {
        settingsName: SettingsTypes.MDE_SETTINGS,
        settings: <MdeSettings />,
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
    ],
    [ROUTES.UMAP]: [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source={"DR"} />,
      },
      {
        settingsName: SettingsTypes.UMAP_SETTINGS,
        settings: <UmapSettings />,
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
    ],
    [ROUTES.TSNE]: [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source={"DR"} />,
      },
      {
        settingsName: SettingsTypes.TSNE_SETTINGS,
        settings: <TsneSettings />,
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
    ],
    "/precomputed": [
      {
        settingsName: SettingsTypes.DR_METHOD_SELECTOR,
        settings: <DrMethodSelector />,
        isAccordion: false,
      },
      {
        settingsName: SettingsTypes.PRECOMPUTED_DR_SETTINGS,
        settings: <PrecomputedDrSettings />,
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />,
      },
    ],
    [ROUTES.GENE_REGULATION]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            source={"GENE_REGULATION"}
            showcellLineOptions={true}
            showPerturbationList={false}
            showGeneList={false}
            showdataTypeOptions={false}
            showgraphTypeOptions={false}
            wholeGenomeOnly={true}
          />
        ),
      },
      {
        settingsName: SettingsTypes.GRAPHMAP_SETTINGS,
        settings: <GeneRegulationSettings />,
      },
    ],
    [ROUTES.GENE_REGULATION_ENHANCED]: [
      {
        settingsName: "Enhanced Gene Regulation Settings",
        settings: <GeneRegulationEnhancedSettings />,
      },
    ],
    [ROUTES.HEATMAP]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            source={"HEATMAP"}
            showgraphTypeOptions={false}
            showdataTypeOptions={false}
          />
        ),
      },
      {
        settingsName: SettingsTypes.HEAT_MAP,
        settings: <HeatMapSettings />,
      },
      {
        settingsName: SettingsTypes.INCHLIB_SETTINGS,
        settings: <InchlibSettings />,
      },
    ],
    [ROUTES.PATHFINDER]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            source={"PATHFINDER"}
            showcellLineOptions={true}
            showPerturbationList={true}
            showGeneList={true}
            showdataTypeOptions={false}
            showgraphTypeOptions={false}
            wholeGenomeOnly={true}
          />
        ),
      },
      {
        settingsName: SettingsTypes.PATH_FINDER_SETTINGS,
        settings: <PathFinderSettings />,
      },
    ],
    [ROUTES.GENESIGNATURE]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            showcellLineOptions={true}
            showdataTypeOptions={false}
            showgraphTypeOptions={false}
            showPerturbationList={false}
            isGeneSignature={true}
          />
        ),
      },
      {
        settingsName: SettingsTypes.GENE_SIGNATURE_SETTINGS,
        settings: <GeneSignatureSettings />,
      },
    ],
    [ROUTES.EXPRESSIONANALYZER]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: (
          <CoreSettings
            showcellLineOptions={true}
            showdataTypeOptions={false}
            showgraphTypeOptions={false}
            showPerturbationList={false}
            isGeneSignature={false}
            showGeneList={false}
          />
        ),
      },
      {
        settingsName: SettingsTypes.EXPRESSION_ANALYZER_SETTINGS,
        settings: <ExpressionAnalyzerSettings />,
      },
    ],
    [ROUTES.GENELISTCOMPARE]: [
      {
        settingsName: SettingsTypes.GENELIST_COMPARE_SETTINGS,
        settings: <GenelistCompareSettings />,
      },
    ],
    [ROUTES.MULTIDATASET_COMPARISON]: [
      {
        settingsName: SettingsTypes.MULTIDATASET_COMPARISON_SETTINGS,
        settings: <MultiDatasetComparisonSettings />,
      },
    ],
  };

  // Debug: log pathname to help troubleshoot
  if (process.env.NODE_ENV !== "production") {
    console.log("SettingsSelector pathname:", pathname, "Available routes:", Object.keys(settingsMap));
    console.log("Settings for pathname:", settingsMap?.[pathname]);
  }

  const settingsForPath = settingsMap?.[pathname] || [];
  
  // Additional debug for precomputed route
  if (process.env.NODE_ENV !== "production" && pathname === "/precomputed") {
    console.log("Precomputed route detected, settings count:", settingsForPath.length);
  }
  
  return (
    <div>
      {settingsForPath.length === 0 && process.env.NODE_ENV !== "production" && (
        <div style={{ padding: "16px", color: "#ff6b6b" }}>
          No settings found for pathname: {pathname}
        </div>
      )}
      {settingsForPath
        .filter(({ settingsName }) => settingsName) // Filter out empty entries
        .map(
          (
            { settingsName, settings, hidden = false, isAccordion = true },
            index
          ) => (
            <div key={settingsName || `setting-${index}`} style={{ display: hidden === false ? "block" : "none" }}>
              <Settings
                expended
                settingsName={settingsName}
                settings={settings}
                isAccordion={isAccordion}
              />
            </div>
          )
        )}
    </div>
  );
};

export { SettingsSelector };
