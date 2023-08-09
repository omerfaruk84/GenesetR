import React from 'react';
import {connect} from 'react-redux';
import { Field, Select, CheckBox, Slider, Spacer, Flex } from '@oliasoft-open-source/react-ui-library';
import { correlationSettingsChanged } from '../../../store/settings/correlation-settings';
import { CorrelationSettingsTypes } from './enums';
import styles from './settings.module.scss';

const CorrelationSettings = ({
  correlationSettings,
  correlationSettingsChanged,
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

  const corrtypeOptions = [
    {
      label: 'Pearson',
      value: 'pearson',
    },
    {
      label: 'Spearman',
      value: 'spearman',
    },
    {
      label: 'Kendall',
      value: 'kendall',
    }
  ];

  return (
    <>
     <Field label='Correlation Algorithm' labelLeft labelWidth={150} helpText = "Set the correlation algorithm. Note that Pearson measures a linear relationship between two variables, while Kendall and Spearman measure how likely it is for two variables to move in the same direction, but not necessarily at a constant rate. Pearson provides information about the strength and direction of the linear relationship between two variables but is sensitive to outliers.">
        <Select
        small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.CORRTYPE,
            newValue: value
          })}
          options={corrtypeOptions}
          value={correlationSettings?.corrType}
        />
      </Field> 
      <Field label='Minimum Correlation' labelLeft labelWidth={150} helpText = "Set the threshold for minimum correlation that will be shown in the table">
        <div className={styles.inputRange}>         
          <Slider
            label={correlationSettings?.filter}
            max={99}
            min={0}            
            value={correlationSettings?.filter * 100}
            onChange={({ target: { value } }) => correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.FILTER,
              newValue: value / 100
            })}
          />
        </div>
      </Field>
      <Field label='Cluster Axis' labelLeft labelWidth={150} helpText = "Set clustering axis (row/both) (default: both)">
        <Select
        small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.AXIS,
            newValue: value
          })}
          options={axisOptions}
          value={correlationSettings?.axis}
        />
      </Field> 
      <Field label='Row Distance' labelLeft labelWidth={150} helpText = "Set the distance to use for clustering rows (default: euclidean)">
        <Select
        small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.ROW_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={correlationSettings?.row_distance}
        />
      </Field>
      <Field label='Column Distance' labelLeft labelWidth={150} helpText = "Set the distance to use for clustering columns (default: euclidean)">
        <Select
        small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.COLUMN_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={correlationSettings?.column_distance}
        />
      </Field>
      <Field label='Row Linkage Method' labelLeft labelWidth={150} helpText = "Set the linkage to use for clustering rows (default: Average)">
        <Select
        small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.ROW_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={correlationSettings?.row_linkage}
        />
      </Field>
      <Field label='Column Linkage Method' labelLeft labelWidth={150} helpText = "Set the linkage to use for clustering columns (default: Average)">
        <Select
         small
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.COLUMN_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={correlationSettings?.column_linkage}
        />
      </Field> 
      <Flex gap="25px">      
      <Field  labelLeft labelWidth={105} label='Normalization' helpText = "Whether to normalize data to (0,1) scale">             
      <CheckBox small onChange={({ target: { checked } }) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.NORMALIZE,
          newValue: checked
        })}
        checked={correlationSettings?.normalize}/>
      </Field>   
      <Field labelLeft labelWidth={105} label='Keep Original' helpText = "Cluster normalized data (only when normalize is checked), but display original data in the heatmap">             
      <CheckBox
      small        
        onChange={({ target: { checked } }) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.WRITE_ORGINAL,
          newValue: checked
        })}
        checked={correlationSettings?.write_original}/>
      </Field>  
      </Flex>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  correlationSettings: settings?.correlation ?? {}
});
const mapDispatchToProps = {
  correlationSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CorrelationSettings);
export { MainContainer as CorrelationSettings };
