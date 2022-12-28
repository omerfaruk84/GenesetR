import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const ClusteringSettings = ({
  clusteringSettings,
}) => {
  const clusteringMetricOptions = [
    {
      label: 'euclidean',
      value: 'euclidean',
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
        checked={clusteringSettings?.showLegend}
      />
      <Spacer height={5} />
      <CheckBox
        label='Show cluster centers'
        onChange={() => { }}
        checked={clusteringSettings?.showClusterCenters}
      />
      <Spacer height={5} />
      <CheckBox
        label='Highlight clusters'
        onChange={() => { }}
        checked={clusteringSettings?.highlightClusters}
      />
      <Spacer height={10} />
      <Field label='Minimum Cluster Size'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={3}
            value={clusteringSettings?.minimumClusterSize}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Clustering Metric'>
        <Select
          onChange={onChangeClusteringMetric}
          options={clusteringMetricOptions}
          value={clusteringSettings?.clusteringMetric}
        />
      </Field>
      <Field label='Clustering Method'>
        <Select
          onChange={onChangeClusteringMethod}
          options={clusteringMethodOptions}
          value={clusteringSettings?.clusteringMethod}
        />
      </Field>
      <Field label='Minimum Samples'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={3}
            value={clusteringSettings?.minimumSamples}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Cluster Selection Epsilon'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1}
            minValue={0}
            value={clusteringSettings?.clusterSelectionEpsilon}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  clusteringSettings: settings?.clustering
});

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(ClusteringSettings);

export { MainContainer as ClusteringSettings };
