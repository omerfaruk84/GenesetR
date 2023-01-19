import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Slider, Flex, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import { heatMapSettingsChanged } from '../../../store/settings/heatmap-settings';
import { HeatMapSettingsTypes } from './enums';
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
      <Field label='Linkage Method'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.LINKAGE_METHOD,
            newValue: value,
          })}
          options={linkageMethodOptions}
          value={heatMapSettings?.linkageMethod}
        />
      </Field>
      <Field label='Distance Metric'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.DISTANCE_METRIC,
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
            settingName: HeatMapSettingsTypes.Z_SCORE_NORMALIZATION,
            newValue: value,
          })}
          options={zScoreNormalizationOptions}
          value={heatMapSettings?.zScoreNormalization}
        />
      </Field>
      <Field label='Standardization'>
        <Select
          onChange={({ target: { value } }) => heatMapSettingsChanged({
            settingName: HeatMapSettingsTypes.STANDARDIZATION,
            newValue: value,
          })}
          options={standardizationOptions}
          value={heatMapSettings?.standardization}
        />
      </Field>
      <Field label='Coloring range'>
        <div className={styles.inputRange}>
          <Flex justifyContent="space-between">
            <Text>{-0.8}</Text>
            <Text>{0.8}</Text>
          </Flex>
          <Slider
            max={8}
            min={-8}
            range
            value={heatMapSettings?.coloringRange?.map(value => value * 10)}
            onChange={({ target: { value } }) => heatMapSettingsChanged({
              settingName: HeatMapSettingsTypes.COLORING_RANGE,
              newValue: value?.map(value => value / 10)
            })}
          />
          <Flex justifyContent="space-between">
            <Text>{heatMapSettings?.coloringRange[0]}</Text>
            <Text>{heatMapSettings?.coloringRange[1]}</Text>
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
            label={heatMapSettings?.size}
            max={20}
            min={1}
            value={heatMapSettings?.size}
            onChange={({ target: { value } }) => heatMapSettingsChanged({
              settingName: HeatMapSettingsTypes.SIZE,
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
  heatMapSettings: settings?.heatMap ?? {},
});

const mapDispatchToProps = {
  heatMapSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(HeatMapSettings);

export { MainContainer as HeatMapSettings };
