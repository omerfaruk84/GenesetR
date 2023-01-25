import React from 'react';
import { connect } from 'react-redux';
import { Field, Input } from '@oliasoft-open-source/react-ui-library';
import { BiClusteringSettingsTypes } from './enums';
import { biClusteringSettingsChanged } from '../../../store/settings/bi-clustering-settings';

const BiClusteringSettings = ({
  biClusteringSettings,
  biClusteringSettingsChanged,
}) => {
 

  return (
    <>
      <Field label='Cluster Count'>
        <Input
          onChange={({ target: { value } }) => biClusteringSettingsChanged({ 
            settingName: BiClusteringSettingsTypes.CLUSTER_COUNT,
            newValue: value
           })}
          placeholder=""
          value={biClusteringSettings?.n_clusters}
          type='number'
        />
      </Field>

      <Field label='Random Initialization Count'>
        <Input
          onChange={({ target: { value } }) => biClusteringSettingsChanged({ 
            settingName: BiClusteringSettingsTypes.INIT_COUNT,
            newValue: value
           })}
          placeholder=""
          value={biClusteringSettings?.n_init}
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
