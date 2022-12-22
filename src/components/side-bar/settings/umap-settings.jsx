import React from 'react';
import { Field, Select, CheckBox, Spacer, Text } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const UmapSettings = () => {
  const umapSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  const onChangeUmapSource = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='UMAP Source'>
        <Select
          onChange={onChangeUmapSource}
          options={umapSourceOptions}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Dimesion Count'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={4}
            minValue={2}
            value={2}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Minimum Distance'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={0.99}
            minValue={0}
            value={0.1}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='Number of Neighbours'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={200}
            minValue={2}
            value={5}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <CheckBox
        label='HDB Scan Clustering'
        onChange={() => { }}
      />
    </>
  );
};

export { UmapSettings };
