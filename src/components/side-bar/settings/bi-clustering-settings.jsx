import React from 'react';
import { connect } from 'react-redux';
import { Field, Select, Input } from '@oliasoft-open-source/react-ui-library';

const BiClusteringSettings = ({
  biClusteringSettings,
}) => {
  const biClusteringSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  const onChangeBiClusterSource = (evt) => {
    console.log(evt);
  };

  return (
    <>
      <Field label='biClustering Source'>
        <Select
          onChange={onChangeBiClusterSource}
          options={biClusteringSourceOptions}
          value={biClusteringSettings?.biClusteringSource}
        />
      </Field>
      <Field label='Cluster Count'>
        <Input
          onChange={({ target: { value } }) => console.log(value)}
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

const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(BiClusteringSettings);

export { MainContainer as BiClusteringSettings };
