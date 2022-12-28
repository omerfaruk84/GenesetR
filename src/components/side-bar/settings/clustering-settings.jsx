import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, CheckBox, Spacer } from '@oliasoft-open-source/react-ui-library';
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

  return (
    <>
      <CheckBox
        label='Show legend'
        onChange={({ target: { checked } }) => clusteringSettingsChanged({
          settingName: ClusteringSettingsTypes.SHOW_LEGEND,
          newValue: checked
        })}
        checked={clusteringSettings?.showLegend}
      />
      <Spacer height={5} />
      <CheckBox
        label='Show cluster centers'
        onChange={({ target: { checked } }) => clusteringSettingsChanged({
          settingName: ClusteringSettingsTypes.SHOW_CLUSTER_CENTERS,
          newValue: checked
        })}
        checked={clusteringSettings?.showClusterCenters}
      />
      <Spacer height={5} />
      <CheckBox
        label='Highlight clusters'
        onChange={({ target: { checked } }) => clusteringSettingsChanged({
          settingName: ClusteringSettingsTypes.HIGHLIGHT_CLUSTERS,
          newValue: checked
        })}
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

const mapDispatchToProps = {
  clusteringSettingsChanged
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(ClusteringSettings);

export { MainContainer as ClusteringSettings };
