import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Flex } from '@oliasoft-open-source/react-ui-library';
import { heatMapSettingsChanged } from '../../../store/settings/heatmap-settings';
import { HeatMapSettingsTypes } from './enums';


const HeatMapSettings = ({
  heatMapSettings,
  heatMapSettingsChanged,
}) => {

  const linkageMethodOptions = [
    {
      label: 'Single',
      value: 'single',
    },
    {
      label: 'Complete',
      value: 'complete',
    },
    {
      label: 'Average',
      value: 'average',
    },
    {
      label: 'Centroid',
      value: 'centroid',
    },
    {
      label: 'Median',
      value: 'median',
    },
    {
      label: 'Ward',
      value: 'ward',
    }

  ];
  
  const distanceMetricOptions = [
    {
      label: 'Euclidean',
      value: 'euclidean',
    },
    {
      label: 'Correlation',
      value: 'correlation',
    },
    {
      label: 'Jaccard',
      value: 'jaccard',
    }
  ];

  const axisOptions = [
    {
      label: 'Both',
      value: 'both',
    },
    {
      label: 'Row',
      value: 'row',
    }
  ];
  
  const normalizationOption = [
    {
      label: 'True',
      value: 'True',
    },
    {
      label: 'False',
      value: 'False',
    }
  ];
  const write_originalOptions = [
    {
      label: 'True',
      value: 'True',
    },
    {
      label: 'False',
      value: 'False',
    }
  ];

  return (
    <>
      <Field label='Cluster Axis' labelLeft labelWidth={150} helpText = "Set clustering axis (row/both) (default: both)">
        <Select
        small
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.AXIS,
            newValue: value
          })}
          options={axisOptions}
          value={heatMapSettings?.axis}
        />
      </Field> 
      <Field label='Row Distance' labelLeft labelWidth={150} helpText = "Set the distance to use for clustering rows (default: euclidean)">
        <Select
        small
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={heatMapSettings?.row_distance}
        />
      </Field>
      <Field label='Column Distance' labelLeft labelWidth={150} helpText = "Set the distance to use for clustering columns (default: euclidean)">
        <Select
        small
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.COLUMN_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={heatMapSettings?.column_distance}
        />
      </Field>
      <Field label='Row Linkage Method' labelLeft labelWidth={150} helpText = "Set the linkage to use for clustering rows (default: Average)">
        <Select
        small
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.row_linkage}
        />
      </Field>
      <Field label='Column Linkage Method' labelLeft labelWidth={150} helpText = "Set the linkage to use for clustering columns (default: Average)">
        <Select
        small
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.COLUMN_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.column_linkage}
        />
      </Field>  
      <Flex gap="25px">  
      <Field  labelLeft labelWidth={105} label='Normalization' helpText = "Whether to normalize data to (0,1) scale">             
      
      <CheckBox small onChange={({ target: { checked } }) => heatMapSettingsChanged({
          settingName: HeatMapSettingsTypes.NORMALIZE,
          newValue: checked
        })}
        checked={heatMapSettings?.normalize}/>

      </Field>
      <Field labelLeft labelWidth={105} label='Keep Original' helpText = "Cluster normalized data (only when normalize is checked), but display original data in the heatmap">             
        <CheckBox
          small        
            onChange={({ target: { checked } }) => heatMapSettingsChanged({
              settingName: HeatMapSettingsTypes.WRITE_ORGINAL,
              newValue: checked
            })}
            checked={heatMapSettings?.write_original}/>
      
      </Field>
      </Flex>
    

     
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  heatMapSettings: settings?.heatMap ?? {},
});

const mapDispatchToProps = {
  heatMapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(HeatMapSettings);

export { MainContainer as HeatMapSettings };
