import React from 'react';
import { connect } from 'react-redux';
import { Popover, Button,Field, Select, Divider,TextArea, Slider , Toggle} from '@oliasoft-open-source/react-ui-library';
import { scatterplotSettingsChanged } from '../../../store/settings/scatterplot-settings';
import styles from './settings.module.scss';
import { ScatterPlotSettingsTypes } from './enums';


const ScatterPlotSettings = ({scatterplotSettings,
  scatterplotSettingsChanged,module}) => {
 
  const labelLocation = [
    {
      label: 'Top',
      value: 'top',
    },
    {
      label: 'Left',
      value: 'left',
    },
    {
      label: 'Right',
      value: 'right',
    },
    {
      label: 'Bottom',
      value: 'bottom',
    },
    {
      label: 'Inside',
      value: 'inside',
    }
  ];
 
  //var currGraph = useLocation().pathname;


  return (
    <>
   
     <Field label='Label Genes' labelLeft labelWidth="130px" helpText="Select the  genes that you would like to label">
     <TextArea
          placeholder='Please enter the target gene list seperated by comma, new line, space, or semicolon.'
          tooltip='Please enter the gene list seperated by comma, new line, space, or semicolon.'
          rows={6}
          resize='vertical'
          value={scatterplotSettings?.genesTolabel}
          onChange={({ target: { value } }) => scatterplotSettingsChanged({
            settingName: ScatterPlotSettingsTypes.GENES_TO_LABEL,
            newValue: value
          })}       
        />
     </Field>
    <Field label='Highlight Clusters' labelLeft labelWidth="130px" helpText="Highlight cluster backgrounds with distinct colors.">
      <Toggle     
       onChange={({ target: { checked } }) => scatterplotSettingsChanged({
        settingName: ScatterPlotSettingsTypes.HIGHLIGHT_CLUSTERS,
        newValue: checked
      })}
      checked={scatterplotSettings?.highlightClusters}
    />
     </Field>

    <Field label='Symbol Size' labelLeft labelWidth="130px" helpText="Adjust size of the symbols representing genes.">
        <div className={styles.inputRange}>         
          <Slider
            label={scatterplotSettings?.symbolSize}
            max={100}
            min={5}
            value={scatterplotSettings?.symbolSize}
            onChange={({ target: { value } }) => scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.SYMBOL_SIZE,
              newValue: value
            })}
          />
        </div>
      </Field>

    <Field label='Cluster Probability' labelLeft labelWidth="130px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => scatterplotSettingsChanged({
        settingName: ScatterPlotSettingsTypes.CLUSTER_PROB,
        newValue: checked
      })}
      checked={scatterplotSettings?.clusterProb}
    />
     </Field>
     <Divider align="left"> Label Settings </Divider>
    <Field label='Location' labelLeft labelWidth="130px">
        <Select
          onChange={({ target: { value } }) => scatterplotSettingsChanged({
            settingName: ScatterPlotSettingsTypes.LABEL_LOC,
            newValue: value
          })}
          options={labelLocation}
          value={scatterplotSettings?.labelLoc}
        /></Field>
         
    <Field label='Show All' labelLeft labelWidth="130px">
         <Toggle          
          onChange={({ target: { checked } }) => scatterplotSettingsChanged({
            settingName: ScatterPlotSettingsTypes.SHOW_LABELS,
            newValue: checked
          })}
          checked={scatterplotSettings?.showLabels}
        />         
    </Field>
    <Field label='Size' labelLeft labelWidth="130px">             
          <div className={styles.inputRange}> 
          <Slider
            label={scatterplotSettings?.labelSize}
            max={30}
            min={5}
            value={scatterplotSettings?.labelSize}
            onChange={({ target: { value } }) => scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.LABEL_SIZE,
              newValue: value
            })}
          />
        </div>
      </Field>
  <Divider align="left"> 3D Scatter Settings </Divider>

    <Field label='Autorotate' labelLeft labelWidth="130px">
      <Toggle         
          onChange={({ target: { checked } }) => scatterplotSettingsChanged({
            settingName: ScatterPlotSettingsTypes.AUTOROTATE,
            newValue: checked
          })}
          checked={scatterplotSettings?.autorotate}
        /> 
        </Field>   
        <Field label='Autorotation Speed' labelLeft labelWidth="130px">
         <div className={styles.inputRange}>         
          <Slider
            label={scatterplotSettings?.rotationSpeed}
            max={30}
            min={5}
            value={scatterplotSettings?.rotationSpeed}
            onChange={({ target: { value } }) => scatterplotSettingsChanged({
              settingName: ScatterPlotSettingsTypes.ROTATION_SPEED,
              newValue: value
            })}
          />
        </div>
        </Field>
        <Field label='Orthogonal Projection' labelLeft labelWidth="130px">   
        <Toggle      
        onChange={({ target: { checked } }) => scatterplotSettingsChanged({
        settingName: ScatterPlotSettingsTypes.PROJECTION,
        newValue: checked
      })}
      checked={scatterplotSettings?.projection}
    />
      </Field>   
      
    </>
  );
};

const mapStateToProps = ({ settings, calcResults , coreSettings}) => ({
  scatterplotSettings: settings?.scatterplot ?? {},
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  scatterplotSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(ScatterPlotSettings);

export { MainContainer as ScatterPlotSettings };
