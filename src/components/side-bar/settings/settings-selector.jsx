import React from 'react';
import { ROUTES } from '../../../common/routes';
import { Settings } from './settings';
import { CoreSettings } from './core-settings';
import { GraphMapSettings } from './graphmap-settings';
import { TsneSettings } from './tsne-settings';
import { BiClusteringSettings } from './bi-clustering-settings';
import { GeneRegulationSettings } from './gene-regulation-core-settings';
import { CorrelationSettings } from './correlation-settings';
import { GeneSignatureSettings } from './genesignature-settings';
import { ClusteringSettings } from './clustering-settings';
import { PcaSettings } from './pca-settings';
import { UmapSettings } from './umap-settings';
import { MdeSettings } from './mde-settings';
import { HeatMapSettings } from './heatmap-settings';
import { PathFinderSettings } from './pathfinder-settings';
import { ScatterPlotSettings } from './scatterplot-settings';
import { SettingsTypes } from './enums';

const SettingsSelector = ({ pathname }) => {
  const settingsMap = {
    [ROUTES.HOME]: [
      {
        //settingsName: SettingsTypes.CORE_SETTINGS,
        //settings: <CoreSettings />
      }
    ],
    [ROUTES.CORRELATION]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source = {"CORR"} showcellLineOptions = {true} showPerturbationList = {true} showGeneList= {true} showdataTypeOptions = {true} showgraphTypeOptions = {false} />
      },
      {
        settingsName: SettingsTypes.CORRELATION_SETTINGS,
        settings: <CorrelationSettings/>
      },
    ],
    [ROUTES.PCA]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings  source = {"DR"} />
      },
      {
        settingsName: SettingsTypes.PCA_SETTINGS,
        settings: <PcaSettings />
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />
      },
    ],
    [ROUTES.MDE]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source = {"DR"} />
      },
      {
        settingsName: SettingsTypes.MDE_SETTINGS,
        settings: <MdeSettings />
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />
      },
    ],
    [ROUTES.UMAP]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source = {"DR"} />
      },
      {
        settingsName: SettingsTypes.UMAP_SETTINGS,
        settings: <UmapSettings />
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />
      },
    ],
    [ROUTES.TSNE]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source = {"DR"} />
      },
      {
        settingsName: SettingsTypes.TSNE_SETTINGS,
        settings: <TsneSettings />
      },
      {
        settingsName: SettingsTypes.CLUSTERING_SETTINGS,
        settings: <ClusteringSettings />
      },
      {
        settingsName: SettingsTypes.SCATTERPLOT_SETTINGS,
        settings: <ScatterPlotSettings />
      },
    ],
    [ROUTES.GENE_REGULATION]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings/>,
        hidden: true
      },
      {
        settingsName: SettingsTypes.GRAPHMAP_SETTINGS,
        settings: <GeneRegulationSettings />
      },      
    ],
    [ROUTES.HEATMAP]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings  source = {"HEATMAP"}  showgraphTypeOptions = {false} showdataTypeOptions = {false}/>
      },
      {
        settingsName: SettingsTypes.HEAT_MAP,
        settings: <HeatMapSettings />
      },
    ],
    [ROUTES.PATHFINDER]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings source = {"PATHFINDER"}  showgraphTypeOptions = {false} showcellLineOptions = {false} showdataTypeOptions = {false} />
      },      
      {
        settingsName: SettingsTypes.PATH_FINDER_SETTINGS,
        settings: <PathFinderSettings />
      }
    ],
    [ROUTES.GENESIGNATURE]: [
      {
        settingsName: SettingsTypes.CORE_SETTINGS,
        settings: <CoreSettings showcellLineOptions = {false} showdataTypeOptions = {false} showgraphTypeOptions = {false}  showPerturbationList = {false} isGeneSignature = {true}  />
      }
      ,
      {
        settingsName: SettingsTypes.GENE_SIGNATURE_SETTINGS,
        settings: <GeneSignatureSettings />
      },
    ],
  };

  return (
    <div>
      {settingsMap?.[pathname]?.map(({ settingsName, settings, hidden = false, isAccordion = true }, key) => (
        <div style={{display:hidden===false? "block": "none"}}>
        <Settings
          key={key}
          expended
          settingsName={settingsName}
          settings={settings}
          isAccordion={isAccordion}
        />
         </div>
      ))}
    </div>
  );
};

export { SettingsSelector };
