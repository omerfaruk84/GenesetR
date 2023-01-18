import React from 'react';
import {connect} from 'react-redux';
import { Field, Select, CheckBox, Slider, Flex, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
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
        onChange={({ target: { checked } }) => correlationSettingsChanged({
          settingName: CorrelationSettingsTypes.REMOVE_LOW_CORRELATION,
          newValue: checked
        })}
        checked={correlationSettings?.removeLowCorrelation}
      />
      <Field label='Min Correlation'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{0}</Text>
            <Text>{0.99}</Text>
          </Flex>
          <Slider
            label={correlationSettings?.minCorrelation}
            max={99}
            min={0}
            disabled={!correlationSettings?.removeLowCorrelation}
            value={correlationSettings?.minCorrelation * 100}
            onChange={({ target: { value } }) => correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.MIN_CORRELATION,
              newValue: value / 100
            })}
          />
        </div>
      </Field>
      <Field label='Linkage Method'>
        <Select
          onChange={({ target: { value } }) => correlationSettingsChanged({
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
          <Flex justifyContent="space-between">
            <Text>{-0.88}</Text>
            <Text>{0.88}</Text>
          </Flex>
          <Slider
            max={88}
            min={-88}
            range
            value={correlationSettings?.coloringRange?.map(value => value * 100)}
            onChange={({ target: { value } }) => correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.COLORING_RANGE,
              newValue: value?.map(value => value / 100)
            })}
          />
          <Flex justifyContent="space-between">
            <Text>{correlationSettings?.coloringRange[0]}</Text>
            <Text>{correlationSettings?.coloringRange[1]}</Text>
          </Flex>
        </div>
      </Field>
      <Field label='Size'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{1}</Text>
            <Text>{20}</Text>
          </Flex>
          <Slider
            label={correlationSettings?.size}
            max={20}
            min={1}
            value={correlationSettings?.size}
            onChange={({ target: { value } }) => correlationSettingsChanged({
              settingName: CorrelationSettingsTypes.SIZE,
              newValue: value
            })}
          />
        </div>
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
