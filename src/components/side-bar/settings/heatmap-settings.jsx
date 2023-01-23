import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import { heatMapSettingsChanged } from '../../../store/settings/heatmap-settings';
import { HeatMapSettingsTypes } from './enums';
import styles from './settings.module.scss';

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
 <Field label='Cluster Axis'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.AXIS,
            newValue: value
          })}
          options={axisOptions}
          value={heatMapSettings?.axis}
        />
      </Field> 
      <Field label='Row Distance'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={heatMapSettings?.row_distance}
        />
      </Field>
      <Field label='Column Distance'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.COLUMN_DISTANCE,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={heatMapSettings?.column_distance}
        />
      </Field>
      <Field label='Row Linkage Method'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.row_linkage}
        />
      </Field>
      <Field label='Column Linkage Method'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.COLUMN_LINKAGE,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.column_linkage}
        />
      </Field>  
      
      <Field label='Normalization'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.NORMALIZE,
            newValue: value,
          })}
          options={normalizationOption}
          value={heatMapSettings?.normalize}
        />
      </Field>
      <Field label='Keep Orginal'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.WRITE_ORGINAL,
            newValue: value,
          })}
          options={write_originalOptions}
          value={heatMapSettings?.write_original}
        />
      </Field>
    

     
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
