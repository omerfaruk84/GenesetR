import React from 'react';
import { Field, Select, CheckBox, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const ClusteringSettings = () => {
  const clusteringMetricOptions = [
    {
      label: 'eulidean',
      value: 'eulidean',
    }
  ];
  const clusteringMethodOptions = [
    {
      label: 'EOM',
      value: 'EOM',
    }
  ];

  const onChangeClusteringMetric = (evt) => {
    console.log(evt);
  }
  const onChangeClusteringMethod = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <CheckBox
        label='Show legend'
        onChange={() => { }}
      />
      <Spacer height={5} />
      <CheckBox
        label='Show cluster centers'
        onChange={() => { }}
      />
      <Spacer height={5} />
      <CheckBox
        label='Highlight clusters'
        onChange={() => { }}
      />
      <Spacer height={10} />
      <Field label='Minimum Cluster Size'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={3}
            value={10}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Clustering Metric'>
        <Select
          onChange={onChangeClusteringMetric}
          options={clusteringMetricOptions}
        />
      </Field>
      <Field label='Clustering Method'>
        <Select
          onChange={onChangeClusteringMethod}
          options={clusteringMethodOptions}
        />
      </Field>
            <Field label='Minimum Samples'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={3}
            value={10}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
            <Field label='Cluster Selection Epsilon'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1}
            minValue={0}
            value={0}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
    </>
  );
};

export { ClusteringSettings };
