import React from 'react';
import { Field, Select, Input } from '@oliasoft-open-source/react-ui-library';

const BiClusteringSettings = () => {
  const biClusteringSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  const onChangeBiClusterSource = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='biClustering Source'>
        <Select
          onChange={onChangeBiClusterSource}
          options={biClusteringSourceOptions}
        />
      </Field>
      <Field label='Cluster Count'>
        <Input
          onChange={({ target: { value } }) => console.log(value)}
          placeholder=""
          value=""
          type='number'
        />
      </Field>
    </>
  );
};

export { BiClusteringSettings };
