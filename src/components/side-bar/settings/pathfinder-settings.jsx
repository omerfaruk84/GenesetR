import React from 'react';
import { connect } from 'react-redux';
import { Field, Slider, TextArea, CheckBox , Toggle, Select, Divider, Spacer} from '@oliasoft-open-source/react-ui-library';
import { PathFinderSettingsTypes } from './enums';
import { pathfinderSettingsChanged } from '../../../store/settings/pathfinder-settings';
import styles from './settings.module.scss';

const PathFinderSettings = ({
  pathfinderSettings,
  pathfinderSettingsChanged,
}) => {

  const layoutOption = [
    {
      label: 'Force',
      value: 'force',
    },
    {
      label: 'Circular',
      value: 'circular',
    },
    {
      label: 'Dagre',
      value: 'none',
    }
  ];

  return (
    <>      
      <Field label='Z Score Cutoff' labelLeft labelWidth="130px" helpText="Score cut-off for knockdown affect between two genes. Minimum suggested value is 0.2.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.cutoff}
            max={40}
            min={0}
            value={pathfinderSettings?.cutoff * 20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>

      <Field label='Search Depth' labelLeft labelWidth="130px" helpText="This parameter refers to the search depth for assessing the knockdown effects. If set to 1 (default), the analysis will only consider the downstream effects of genes on the downregulated list. However, if set to 2, the analysis extends to include genes that become downregulated upon the knockdown of the genes initially listed as downregulated.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.depth}
            max={2}
            min={1}
            value={pathfinderSettings?.depth}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.DEPTH,
              newValue: value,
            })}
          />
         </div>
      </Field>
      
      
       <Field>
        <CheckBox
          onChange={({ target: { checked } }) => pathfinderSettingsChanged({
            settingName: PathFinderSettingsTypes.CHECK_CORR,
            newValue: checked,
           
          })}
          checked={pathfinderSettings?.checkCorr}
          label='Include Correlation'
        />
        </Field>
      
      <Field label='Correlation Cutoff' labelLeft labelWidth="130px" helpText="The threshold of correlation significance. By adjusting this filter, users can control the minimum strength of correlation needed for a relationship between two genes to be considered in the analysis.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.corrCutOff}
            max={10}
            min={2}
            value={pathfinderSettings?.corrCutOff * 20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.CORR_CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>


      <Field>
        <CheckBox
          onChange={({ target: { checked } }) => pathfinderSettingsChanged({
            settingName: PathFinderSettingsTypes.CHECK_BIOGRID,
            newValue: checked
            
          })}
          checked={pathfinderSettings?.BioGridData}
          label='Include BioGRID'
        />
      </Field>
      <Divider>Graph Settings</Divider>
      <Field label='Minimum Neighbour Count' labelLeft labelWidth="130px" helpText="Sets the minimum nuber of neighbours required for a particular node to be visible">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.minNeighbourCount}
            max={20}
            min={0}
            value={pathfinderSettings?.minNeighbourCount}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.MIN_NEIGHBOUR_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>

      <Field label='Maximum Node Size' labelLeft labelWidth="130px" helpText="Sets the maximum size of the nodes. Node size will be based on number of neighbours.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.maxNodeSize}
            max={60}
            min={10}
            value={pathfinderSettings?.maxNodeSize}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.MAX_NODE_SIZE,
              newValue: value,
            })}
          />
        </div>
      </Field>
      <Field label='Minimum Node Opacity' labelLeft labelWidth="130px" helpText="Sets the minimum opacity of the nodes. Node opacity will be based on knockdown efficiency of the particular node.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.minNodeopacity}
            max={20}
            min={2}
            value={pathfinderSettings?.minNodeopacity *20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.MINIMUM_NODE_OPACITY,
              newValue: value/20,
            })}
          />
        </div>
      </Field>
      <Field label='Minimum Edge Opacity' labelLeft labelWidth="130px" helpText="Sets the minimum opacity of the edges. Edge opacity will be based on absolute effect size.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.minEdgeopacity}
            max={20}
            min={2}
            value={pathfinderSettings?.minEdgeopacity *20}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.MINIMUM_EDGE_OPACITY,
              newValue: value/20,
            })}
          />
        </div>
      </Field>
      <Field label='Labels to show' labelLeft labelWidth="130px" helpText="Sets the minimum number of neighbours for a node to show its label">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.showLabels}
            max={20}
            min={0}
            value={pathfinderSettings?.showLabels}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.SHOW_LABELS,
              newValue: value,
            })}
          />
        </div>
      </Field>
      
      <Field label='Maximum Nodes' labelLeft labelWidth="130px" helpText="Maximum number of nodes to display. Large networks will be limited to top nodes by neighbour count to prevent performance issues.">
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.maxNodes || 1000}
            max={2000}
            min={100}
            value={pathfinderSettings?.maxNodes || 1000}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.MAX_NODES,
              newValue: value,
            })}
          />
        </div>
      </Field>
        
 

      <Field label='Layout' labelLeft labelWidth="130px" helpText="Set the layout style for genes.">
        <Select
          onChange={({ target: { value } }) => pathfinderSettingsChanged({
            settingName: PathFinderSettingsTypes.LAYOUT,
            newValue: value
          })}
          options={layoutOption}
          value={pathfinderSettings?.layout}
        />
      </Field>

      {pathfinderSettings?.layout === 'force'? 
      <Field label='Repulsion' labelLeft labelWidth="130px" helpText="The repulsion factor between nodes. The repulsion will be stronger and the distance between two nodes becomes further as this value becomes larger.">
        <div className={styles.inputRange}>         
          <Slider
            label={pathfinderSettings?.repulsion}
            max={1000}
            min={50}
            value={pathfinderSettings?.repulsion}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.REPULSION,
              newValue: value
            })}
          />
        </div>
      </Field>:""}

       {pathfinderSettings?.layout === 'none'?
      <Field label='Dagre Layout Node Seperation' labelLeft labelWidth="130px" helpText="Sets the seperation">
        <div className={styles.inputRange}>         
          <Slider
            label={pathfinderSettings?.dagreSeperation}
            max={1000}
            min={-1000}
            value={pathfinderSettings?.dagreSeperation}
            onChange={({ target: { value } }) => pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.DAGRE_SEPERATION,
              newValue: value
            })}
          />
        </div>
      </Field>:""
      }

    <Field label='Isolated nodes' labelLeft labelWidth="130px" helpText="Hide/Show genes that are not connected to any other gene.">
          <Toggle
          label = "Show"
          onChange={({ target: { checked } }) => pathfinderSettingsChanged({
            settingName: PathFinderSettingsTypes.ISOLATED_NODES,
            newValue: checked
          })}
          checked={pathfinderSettings?.isolatednodes}
        />
     </Field>

      <Divider align="left"> Noise filters </Divider>
      <Field
        label="Filter Black Listed sgRNAs"
        helpText="Enables or disables the filtering of blacklisted sgRNAs (sgRNAs that increase or decrease total mRNA levels). When 'Directional Only' is enabled, genes that downregulate or upregulate total mRNA levels will be removed from UPR and UNR genes, respectively."
      >
        <Spacer width="10px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER1_ENABLED,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter1Enabled}
          label="Enabled"
        />
        <Spacer width="16px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER1_DIRECTIONAL,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter1Directional}
          disabled={!pathfinderSettings?.filter1Enabled}
          label="Directional Only"
        />
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.filterBlackListed}
            max={60}
            min={24}
            disabled={!pathfinderSettings?.filter1Enabled}
            value={pathfinderSettings?.filterBlackListed * 20}
            onChange={({ target: { value } }) =>
              pathfinderSettingsChanged({
                settingName: PathFinderSettingsTypes.FILTER_BLACKLISTED,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>
      <Field
        label="Filter Black Listed Genes"
        helpText="Enables or disables the filtering of blacklisted genes (Genes that tend to be up or down regulated by abormally high number of sgRNAs). When 'Directional Only' is enabled, genes that tend to be nonspecifically up or downregulated will be removed from the genes that are up or downregulated by GOI, respectively"
      >
        <Spacer width="10px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER2_ENABLED,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter2Enabled}
          label="Enabled"
        />
        <Spacer width="16px" />
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER2_DIRECTIONAL,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter2Directional}
          disabled={!pathfinderSettings?.filter2Enabled}
          label="Directional Only"
        />
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.filterBlackListedExp}
            disabled={!pathfinderSettings?.filter2Enabled}
            max={60}
            min={24}
            value={pathfinderSettings?.filterBlackListedExp * 20}
            onChange={({ target: { value } }) =>
              pathfinderSettingsChanged({
                settingName: PathFinderSettingsTypes.FILTER_BLACKLISTED_EXP,
                newValue: value / 20,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Perturbation Count Filter"
        helpText="Filters out genes that deregulate more than selected number of genes upon their knockdown. Default value is 750."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER3_ENABLED,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter3Enabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.filterCount}
            disabled={!pathfinderSettings?.filter3Enabled}
            max={2500}
            step={250}
            min={250}
            value={pathfinderSettings?.filterCount}
            onChange={({ target: { value } }) =>
              pathfinderSettingsChanged({
                settingName: PathFinderSettingsTypes.FILTER_COUNT,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

      <Field
        label="Gene Expression Count Filter"
        helpText="Filters out genes that are deregulated by more than selected number of perturbations. Default value is 750."
      >
        <Toggle
          onChange={({ target: { checked } }) =>
            pathfinderSettingsChanged({
              settingName: PathFinderSettingsTypes.FILTER4_ENABLED,
              newValue: checked,
            })
          }
          checked={pathfinderSettings?.filter4Enabled}
          label="Enabled"
        />
        <div className={styles.inputRange}>
          <Slider
            label={pathfinderSettings?.filterCountExp}
            disabled={!pathfinderSettings?.filter4Enabled}
            max={1000}
            step={250}
            min={250}
            value={pathfinderSettings?.filterCountExp}
            onChange={({ target: { value } }) =>
              pathfinderSettingsChanged({
                settingName: PathFinderSettingsTypes.FILTER_COUNT_EXP,
                newValue: value,
              })
            }
          />
        </div>
      </Field>

    </>
  );
};


const mapStateToProps = ({ settings }) => ({
  pathfinderSettings: settings?.pathfinder ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  pathfinderSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PathFinderSettings);

export { MainContainer as PathFinderSettings };
