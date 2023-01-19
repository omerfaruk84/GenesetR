import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { heatMapSettingsChanged } from '../../../store/settings/heatmap-settings';
import { HeatMapSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const HeatMapSettings = ({
  heatMapSettings,
  heatMapSettingsChanged,
}) => {
  const linkageMethodOptions = [
    {
      label: 'complete',
      value: 'complete',
    }
  ];
  const distanceMetricOptions = [
    {
      label: 'euclidean',
      value: 'euclidean',
    }
  ];
  const mapColorOptions = [
    {
      label: 'bwr',
      value: 'bwr',
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
      <Field label='Linkage Method'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_LINKAGE,
            newValue: value,
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.linkageMethod}
        />
      </Field>
      <Field label='Distance Metric'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.ROW_DISTANCE,
            newValue: value,
          })}
          options={distanceMetricOptions}
          value={heatMapSettings?.distanceMetric}
        />
      </Field>
      <Field label='Map Color'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.MAP_COLOR,
            newValue: value,
          })}
          options={mapColorOptions}
          value={heatMapSettings?.mapColor}
        />
      </Field>
      <Field label='Z Score Normalization'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.NORMALIZE,
            newValue: value,
          })}
          options={normalizationOption}
          value={heatMapSettings?.zScoreNormalization}
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
      <Field label='Coloring range'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={0.8}
            minValue={-0.8}
            value={heatMapSettings?.coloringRange}
            onChange={value => console.log(value)}
            onChangeComplete={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Size'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={20}
            minValue={1}
            value={heatMapSettings?.size}
            onChange={(value) => heatMapSettingsChanged({
              settingName: HeatMapSettingsTypes.SIZE,
              newValue: value,
            })}
          />
        </div>
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
