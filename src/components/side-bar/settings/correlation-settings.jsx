import React from 'react';
import {connect} from 'react-redux';
import { Field, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import { correlationSettingsChanged } from '../../../store/settings/correlation-settings';
import { CorrelationSettingsTypes } from './enums';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const CorrelationSettings = ({
  correlationSettings,
  correlationSettingsChanged,
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
  const zScoreNormalizationOptions = [
    {
      label: 'None',
      value: 'None',
    }
  ];
  const standardizationOptions = [
    {
      label: 'None',
      value: 'None',
    }
  ];

  return (
    <>
      <CheckBox
        label="Remove low correlation"
        onChange={({ target: { checked }}) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.REMOVE_LOW_CORRELATION,
          newValue: checked
        })}
        checked={correlationSettings?.removeLowCorrelation}
      />
      <Field label='Min Correlation'>
        <div className={styles.inputRange}>
          <InputRange
            disabled={!correlationSettings?.removeLowCorrelation}
            maxValue={0.99}
            minValue={0}
            value={correlationSettings?.minCorrelation}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Linkage Method'>
        <Select
          onChange={({ target: { value }}) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.LINKAGE_METHOD,
            newValue: value
          })}
          options={linkageMethodOptions}
          value={correlationSettings?.linkageMethod}
        />
      </Field>
      <Field label='Distance Metric'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.DISTANCE_METRIC,
            newValue: value
          })}
          options={distanceMetricOptions}
          value={correlationSettings?.distanceMetric}
        />
      </Field>
      <Field label='Z Score Normalization'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.Z_SCORE_NORMALIZATION,
            newValue: value
          })}
          options={zScoreNormalizationOptions}
          value={correlationSettings?.zScoreNormalization}
        />
      </Field>
      <Field label='Standardization'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
            settingName: CorrelationSettingsTypes.STANDARDIZATION,
            newValue: value
          })}
          options={standardizationOptions}
          value={correlationSettings?.standardization}
        />
      </Field>
      <Field label='Coloring range'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={0.8}
            minValue={-0.8}
            value={correlationSettings?.coloringRange}
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
            value={correlationSettings?.size}
            onChange={(value) => correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.SIZE,
              newValue: value
            })}
          />
        </div>
      </Field>
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
