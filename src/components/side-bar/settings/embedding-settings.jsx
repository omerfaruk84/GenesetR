import React from 'react';
import { Field, Select, CheckBox, Text, Spacer } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const EmbeddingSettings = () => {
  const embedingSourceOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];
  const mdeConstraintOptions = [
    {
      label: 'PCA Data',
      value: 'PCA Data',
    }
  ];

  const onChangeEmbedingSource = (evt) => {
    console.log(evt);
  }
  const onChangeMdeConstraint = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='Embeding Source'>
        <Select
          onChange={onChangeEmbedingSource}
          options={embedingSourceOptions}
        />
        <Spacer height={10} />
        <Text>You need to first perform PCA to use it in embeding!</Text>
      </Field>
      <Field label='Dimension Count'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={4}
            minValue={2}
            value={2}
            onChange={value => console.log(value)}
          />
        </div>
      </Field>
      <Field label='MDE Constraint'>
        <Select
          onChange={onChangeMdeConstraint}
          options={mdeConstraintOptions}
        />
      </Field>
      <Field label='Repulsive Fraction'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={5}
            minValue={0.1}
            value={0.5}
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

export { EmbeddingSettings };
