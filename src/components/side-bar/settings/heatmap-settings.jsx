import React from 'react';
import { connect } from 'react-redux';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const HeatmapSettings = ({
  heatMapSettings,
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

  const onChangeLinkageMethod = (evt) => {
    console.log(evt);
  }
  const onChangeDistanceMetric = (evt) => {
    console.log(evt);
  }
  const onChangeMapColor = (evt) => {
    console.log(evt);
  }
  const onChangeZScoreNormalization = (evt) => {
    console.log(evt);
  }
  const onChangeStandardization = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='Linkage Method'>
        <Select
          onChange={onChangeLinkageMethod}
          options={linkageMethodOptions}
          value={heatMapSettings?.linkageMethod}
        />
      </Field>
      <Field label='Distance Metric'>
        <Select
          onChange={onChangeDistanceMetric}
          options={distanceMetricOptions}
          value={heatMapSettings?.distanceMetric}
        />
      </Field>
      <Field label='Map Color'>
        <Select
          onChange={onChangeMapColor}
          options={mapColorOptions}
          value={heatMapSettings?.mapColor}
        />
      </Field>
      <Field label='Z Score Normalization'>
        <Select
          onChange={onChangeZScoreNormalization}
          options={zScoreNormalizationOptions}
          value={heatMapSettings?.zScoreNormalization}
        />
      </Field>
      <Field label='Standardization'>
        <Select
          onChange={onChangeStandardization}
          options={standardizationOptions}
          value={heatMapSettings?.standardization}
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
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  heatMapSettings: settings?.heatMap ?? {},
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(HeatmapSettings);

export { MainContainer as HeatmapSettings };
