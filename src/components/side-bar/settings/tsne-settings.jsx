import React from 'react';
import { Field, Select, CheckBox, Text } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const TsneSettings = () => {
  const tsneSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];
  
  const onChangetsneSource = (evt) => {
    console.log(evt);
  };

  return (
    <>
      <Field label='tSNE Source'>
        <Select
          onChange={onChangetsneSource}
          options={tsneSourceOptions}
        />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Perplexity'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={300}
            minValue={1}
            value={5}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Learning Rate'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1000}
            minValue={10}
            value={200}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Learning Rate'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={5000}
            minValue={250}
            value={1000}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field label='Early Exaggeration %'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={25}
            minValue={1}
            value={5}
            onChange={value => console.log({ value })}
          />
        </div>
      </Field>
      <Field>
        <CheckBox
          label="HDB Scan Clustering"
          onChange={() => { }}
          checked={true}
        />
      </Field>
    </>
  );
};

export { TsneSettings };
