import React from 'react';
import {connect} from 'react-redux';
import { Field, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const CorrelationSettings = ({
  correlationSettings,
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

  const onChangeLinkageMethod = (evt) => {
    console.log(evt);
  }
  const onChangeDistanceMetric = (evt) => {
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
      <CheckBox
        label="Remove low correlation"
        onChange={() => { }}
        checked={correlationSettings?.removeLowCorrelation}
      />
      <Field label='Min Correlation'>
        <div className={styles.inputRange}>
          <InputRange
            disabled
            maxValue={0.99}
            minValue={0}
            value={correlationSettings?.minCorrelation}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Linkage Method'>
        <Select
          onChange={onChangeLinkageMethod}
          options={linkageMethodOptions}
          value={correlationSettings?.linkageMethod}
        />
      </Field>
      <Field label='Distance Metric'>
        <Select
          onChange={onChangeDistanceMetric}
          options={distanceMetricOptions}
          value={correlationSettings?.distanceMetric}
        />
      </Field>
      <Field label='Z Score Normalization'>
        <Select
          onChange={onChangeZScoreNormalization}
          options={zScoreNormalizationOptions}
          value={correlationSettings?.zScoreNormalization}
        />
      </Field>
      <Field label='Standardization'>
        <Select
          onChange={onChangeStandardization}
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
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  correlationSettings: settings?.correlation ?? {}
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(CorrelationSettings);
export { MainContainer as CorrelationSettings };
