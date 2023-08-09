import React from 'react';
import { connect } from 'react-redux';
import { Field, Slider, TextArea, CheckBox , Toggle, Select, Divider} from '@oliasoft-open-source/react-ui-library';
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


      

    </>
  );
};


const mapStateToProps = ({ settings }) => ({
  pathfinderSettings: settings?.pathfinder ?? {},
});

const mapDispatchToProps = {
  pathfinderSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(PathFinderSettings);

export { MainContainer as PathFinderSettings };
