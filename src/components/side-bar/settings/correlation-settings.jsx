import React from 'react';
import {connect} from 'react-redux';
import { Field, Select, CheckBox, Slider, Spacer } from '@oliasoft-open-source/react-ui-library';
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
     <Field label='Correlation Algorithm'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.CORRTYPE,
            newValue: value
          })}
          options={corrtypeOptions}
          value={correlationSettings?.corrType}
        />
      </Field> 
      <Field label='Minimum Correlation'>
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
      <Field label='Cluster Axis'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.AXIS,
            newValue: value
          })}
          options={axisOptions}
          value={correlationSettings?.axis}
        />
      </Field> 
      <Field label='Row Distance'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.ROW_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={correlationSettings?.row_distance}
        />
      </Field>
      <Field label='Column Distance'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.COLUMN_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={correlationSettings?.column_distance}
        />
      </Field>
      <Field label='Row Linkage Method'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.ROW_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={correlationSettings?.row_linkage}
        />
      </Field>
      <Field label='Column Linkage Method'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.COLUMN_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={correlationSettings?.column_linkage}
        />
      </Field>       
      <Field>             
      <CheckBox
        label="Normalization"
        onChange={({ target: { checked } }) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.NORMALIZE,
          newValue: checked
        })}
        checked={correlationSettings?.normalize}/>
      </Field>   
      <Field>             
      <CheckBox
        label="Keep Orginal"
        onChange={({ target: { checked } }) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.WRITE_ORGINAL,
          newValue: checked
        })}
        checked={correlationSettings?.write_original}/>
      </Field>  
      <Spacer height={50} />
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
