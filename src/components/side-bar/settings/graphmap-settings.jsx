import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, TextArea, Text, Spacer, Slider , Toggle} from '@oliasoft-open-source/react-ui-library';
import { graphmapSettingsChanged } from '../../../store/settings/graphmap-settings';
import styles from './settings.module.scss';


import { GraphmapSettingsTypes } from './enums';
import { useLocation } from 'react-router-dom';

const GraphMapSettings = ({
  graphmapSettings,
  graphmapSettingsChanged,module,SettingsSelector,
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
  const dataTypeOptions = [
    {
      label: 'Perturbation',
      value: 1,
    },
    {
      label: 'Gene Expression',
      value: 2,
    },
    {
      label: 'Perturbation Correlation',
      value: 3,
    },
    {
      label: 'Expression Correlation',
      value: 4,
    }
  ];
  const graphTypeOptions = [
    {
      label: '2D',
      value: '2D',
    },
    {
      label: '3D',
      value: '3D',
    }
  ];

  var currGraph = useLocation().pathname;

  return (
    <>
    <Field label='Repulsion' labelLeft labelWidth="130px" helpText="Repulsion is what">
        <div className={styles.inputRange}>         
          <Slider
            label={graphmapSettings?.repulsion}
            max={1000}
            min={50}
            value={graphmapSettings?.repulsion}
            onChange={({ target: { value } }) => graphmapSettingsChanged({
              settingName: GraphmapSettingsTypes.REPULSION,
              newValue: value
            })}
          />
        </div>
      </Field>

      <Field label='Layout' labelLeft labelWidth="130px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.LAYOUT,
            newValue: value
          })}
          options={layoutOption}
          value={graphmapSettings?.layout}
        />
      </Field>


      
      <Field label='Isolated nodes' labelLeft labelWidth="130px" helpText="Repulsion is what">
      <Toggle
      label = "Show"
       onChange={({ target: { checked } }) => graphmapSettingsChanged({
        settingName: GraphmapSettingsTypes.ISOLATED_NODES,
        newValue: checked
      })}
      checked={graphmapSettings?.isolatednodes}
    />
     </Field>
      
      <Field label='Data Type' labelLeft labelWidth="130px" helpText="Repulsion is what">
        <Select
          onChange={({ target: { value } }) => graphmapSettingsChanged({
            settingName: GraphmapSettingsTypes.DATA_TYPE,
            newValue: value
          })}
          options={dataTypeOptions}
          value={graphmapSettings?.dataType}
        />
      </Field>
   
      
    </>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  graphmapSettings: settings?.graphmap ?? {},
  currentGraph: calcResults?.currentGraph ?? null,
});

const mapDispatchToProps = {
  graphmapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GraphMapSettings);

export { MainContainer as GraphMapSettings };
