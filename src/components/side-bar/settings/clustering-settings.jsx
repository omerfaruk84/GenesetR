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
      <Field labelLeft labelWidth="130px" label='Minimum Number Of Samples' helpText="The minimum number of neighbours to a core point. The higher this value is, the more points are going to be discarded as noise/outliers. So increasing this value will increase the size of the clusters, but it does so by discarding small clusters as outliers. If the value is set to 0, HDBScan will try to detect the optimal value, automatically.">
        <div className={styles.inputRange}>        
          <Slider
            label={clusteringSettings?.minimumSamples}
            max={100}
            min={0}
            value={clusteringSettings?.minimumSamples}
            onChange={({ target: { value } }) => clusteringSettingsChanged({
              settingName: ClusteringSettingsTypes.MINIMUM_SAMPLES,
              newValue: value
            })}
          />
 
        </div>
      </Field>
      <Field labelLeft style={{ "white-space": "pre-wrap"}} labelWidth="130px" label='Minimum Cluster Size' 
      helpText="The minimum size a final cluster can be. The higher this is, the bigger your clusters
      will be. Increasing this value will merge any smaller clusters with their most similar 
      neighbour until all clusters are above this value. This should be greater than or equal to minimum sample size.
      * If you want many highly specific clusters, use a small min_samples and a small min_cluster_size.
      * If you want more generalized clusters but still want to keep most detail, use a small min_samples and a large min_cluster_size
      * If you want very very general clusters and to discard a lot of noise in the clusters, use a large min_samples and a large min_cluster_size.">
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
