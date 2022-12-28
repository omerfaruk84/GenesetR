import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Input } from '@oliasoft-open-source/react-ui-library';
import { BiClusteringSettingsTypes } from './enums';
import { biClusteringSettingsChanged } from '../../../store/settings/bi-clustering-settings';

const BiClusteringSettings = ({
  biClusteringSettings,
  biClusteringSettingsChanged,
}) => {
  const biClusteringSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  return (
    <>
      <Field label='biClustering Source'>
        <Select
          onChange={({ target: { value } }) => biClusteringSettingsChanged({
            settingName: BiClusteringSettingsTypes.BI_CLUSTERING_SOURCE,
            newValue: value
          })}
          options={biClusteringSourceOptions}
          value={biClusteringSettings?.biClusteringSource}
        />
      </Field>
      <Field label='Cluster Count'>
        <Input
          onChange={({ target: { value } }) => biClusteringSettingsChanged({ 
            settingName: BiClusteringSettingsTypes.CLUSTER_COUNT,
            newValue: value
           })}
          placeholder=""
          value={biClusteringSettings?.clusterCount}
          type='number'
        />
      </Field>
    </>
  );
};


const mapStateToProps = ({ settings }) => ({
  biClusteringSettings: settings?.biClustering ?? {},
});

const mapDispatchToProps = {
  biClusteringSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(BiClusteringSettings);

export { MainContainer as BiClusteringSettings };
