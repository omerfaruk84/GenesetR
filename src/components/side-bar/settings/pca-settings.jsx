import React from 'react';
import { Field, Select, CheckBox } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const PcaSettings = () => {
  const pcaSourceOptions = [
    {
      label: 'Correlation Data',
      value: 'Correlation Data',
    }
  ];

  const onChangePcaSource = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='PCA Source'>
        <Select
          onChange={onChangePcaSource}
          options={pcaSourceOptions}
        />
      </Field>
      <Field label='Number of components'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={100}
            minValue={2}
            value={10}
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

export { PcaSettings };
