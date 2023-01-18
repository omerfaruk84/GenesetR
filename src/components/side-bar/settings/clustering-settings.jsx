import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Spacer } from '@oliasoft-open-source/react-ui-library';
import { ClusteringSettingsTypes } from './enums';
import { clusteringSettingsChanged } from '../../../store/settings/clustering-settings';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const ClusteringSettings = ({
  clusteringSettings,
  clusteringSettingsChanged,
}) => {
  const clusteringMetricOptions = [
    {
      label: 'Euclidean',
      value: 'euclidean',
    },
    {
      label: 'Manhattan',
      value: 'manhattan',
    },    
    {
      label: 'Jaccard',
      value: 'jaccard',
    }
  ];
  const clusteringMethodOptions = [
    {
      label: 'EOM',
      value: 'eom',
    },
    {
      label: 'LEAF',
      value: 'leaf',
    }
  ];

  return (
    <>
      
      <Spacer height={10} />
      <Field label='Minimum Cluster Size'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={200}
            minValue={3} //How to set default values
            value={clusteringSettings?.minimumClusterSize}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Clustering Metric'>
        <Select
          onChange={({ target: { value } }) => clusteringSettingsChanged({
            settingName: ClusteringSettingsTypes.CLUSTERING_METRIC,
            newValue: value
          })}
          options={clusteringMetricOptions}
          value={clusteringSettings?.clusteringMetric}
        />
      </Field>
      <Field label='Clustering Method'>
        <Select
          onChange={({ target: { value } }) => clusteringSettingsChanged({
            settingName: ClusteringSettingsTypes.CLUSTERING_METHOD,
            newValue: value
          })}
          options={clusteringMethodOptions}
          value={clusteringSettings?.clusteringMethod}
        />
      </Field>
      
      <Field label='Minimum Samples'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={3} //How can we set default to None
            value={clusteringSettings?.minimumSamples}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Cluster Selection Epsilon'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
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

const mapDispatchToProps = {
  clusteringSettingsChanged
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(ClusteringSettings);

export { MainContainer as ClusteringSettings };
