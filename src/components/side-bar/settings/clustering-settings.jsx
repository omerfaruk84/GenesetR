import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Spacer, Slider, Text, Flex } from '@oliasoft-open-source/react-ui-library';
import { ClusteringSettingsTypes } from './enums';
import { clusteringSettingsChanged } from '../../../store/settings/clustering-settings';
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
      <Field labelLeft labelWidth="130px" label='Minimum Cluster Size'>
        <div className={styles.inputRange}>          
          <Slider
            label={clusteringSettings?.minimumClusterSize}
            max={200}
            min={3}
            value={clusteringSettings?.minimumClusterSize}
            onChange={({ target: { value } }) => clusteringSettingsChanged({
              settingName: ClusteringSettingsTypes.MINIMUM_CLUSTER_SIZE,
              newValue: value
            })}
          />
        </div>
      </Field>
      <Field labelLeft  labelWidth="130px" label='Clustering Metric'>
        <Select
          onChange={({ target: { value } }) => clusteringSettingsChanged({
            settingName: ClusteringSettingsTypes.CLUSTERING_METRIC,
            newValue: value
          })}
          options={clusteringMetricOptions}
          value={clusteringSettings?.clusteringMetric}
        />
      </Field>
      <Field labelLeft labelWidth="130px" label='Clustering Method'>
        <Select
          onChange={({ target: { value } }) => clusteringSettingsChanged({
            settingName: ClusteringSettingsTypes.CLUSTERING_METHOD,
            newValue: value
          })}
          options={clusteringMethodOptions}
          value={clusteringSettings?.clusteringMethod}
        />
      </Field>
      <Field labelLeft labelWidth="130px" label='Minimum Samples'>
        <div className={styles.inputRange}>        
          <Slider
            label={clusteringSettings?.minimumSamples}
            max={100}
            min={3}
            value={clusteringSettings?.minimumSamples}
            onChange={({ target: { value } }) => clusteringSettingsChanged({
              settingName: ClusteringSettingsTypes.MINIMUM_SAMPLES,
              newValue: value
            })}
          />
 
        </div>
      </Field>
      <Field labelLeft labelWidth="130px" label='Cluster Selection Epsilon'>
        <div className={styles.inputRange}>          
          <Slider
            label={clusteringSettings?.clusterSelectionEpsilon}
            max={100}
            min={3}
            value={clusteringSettings?.clusterSelectionEpsilon}
            onChange={({ target: { value } }) => clusteringSettingsChanged({
              settingName: ClusteringSettingsTypes.CLUSTER_SELECTION_EPSILON,
              newValue: value
            })}
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
