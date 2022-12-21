import React, { useState } from 'react';
import { Field, Select } from '@oliasoft-open-source/react-ui-library';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
import styles from './settings.module.scss';

const GeneRegulationSettings = () => {
  const [value, setValue] = useState(0.1);
  const geneOptions = [
    {
      label: 'SLC39A10',
      value: 'SLC39A10',
    }
  ];

  const onChangeGene = (evt) => {
    console.log(evt);
  }

  return (
    <>
      <Field label='Select a gene'>
        <Select
          onChange={onChangeGene}
          options={geneOptions}
        />
      </Field>
      <Field label='Absolute Z Score/Correlation r'>
        <div className={styles.inputRange}>
          <InputRange
            maxValue={1}
            minValue={0}
            value={value}
            onChange={value => setValue(value)}
          />
        </div>
      </Field>
    </>
  );
};

export { GeneRegulationSettings };
